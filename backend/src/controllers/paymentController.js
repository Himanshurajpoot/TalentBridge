const pool = require("../config/db");
const {
    createRazorpayOrder,
    verifyRazorpayPaymentSignature,
} = require("../services/razorpayService");

const PAYMENT_PROVIDER = "razorpay";
const PAYMENT_CURRENCY = "INR";

const convertRupeesToPaise = (amount) => {
    if (typeof amount !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(amount)) {
        return null;
    }

    const [rupees, fraction = ""] = amount.split(".");
    const paise =
        BigInt(rupees) * 100n +
        BigInt(fraction.padEnd(2, "0"));

    if (paise <= 0n || paise > BigInt(Number.MAX_SAFE_INTEGER)) {
        return null;
    }

    return Number(paise);
};

const isValidContractId = (contractId) =>
    /^[1-9]\d*$/.test(contractId) &&
    BigInt(contractId) <= 9223372036854775807n;

const frontendOrderDetails = (payment, keyId) => ({
    paymentId: String(payment.id),
    razorpayOrderId: payment.provider_order_reference,
    amount: payment.amount_paise,
    currency: PAYMENT_CURRENCY,
    keyId,
});

const createContractPaymentOrder = async (req, res) => {
    const { contractId } = req.params;
    const idempotencyKey = req.get("Idempotency-Key")?.trim();

    if (!isValidContractId(contractId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid contract ID",
        });
    }

    if (!idempotencyKey || idempotencyKey.length > 255) {
        return res.status(400).json({
            success: false,
            message: "A valid Idempotency-Key header is required",
        });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId?.startsWith("rzp_test_") || !keySecret?.trim()) {
        return res.status(503).json({
            success: false,
            message: "Razorpay test-mode credentials are not configured",
        });
    }

    if (req.user.role !== "client") {
        return res.status(403).json({
            success: false,
            message: "Only clients can initiate contract payments",
        });
    }

    let client;
    let payment;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        await client.query(
            "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
            [idempotencyKey],
        );

        const contractResult = await client.query(
            `SELECT id, client_id, freelancer_id, agreed_amount, status
             FROM contracts
             WHERE id = $1
             FOR UPDATE`,
            [contractId],
        );

        if (contractResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Contract not found",
            });
        }

        const contract = contractResult.rows[0];

        if (Number(contract.client_id) !== Number(req.user.id)) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                success: false,
                message: "Only the contract client can initiate payment",
            });
        }

        if (contract.status !== "active") {
            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message: "Only active contracts are eligible for payment",
            });
        }

        const amountPaise = convertRupeesToPaise(contract.agreed_amount);

        if (amountPaise === null) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message: "Contract amount is not eligible for payment",
            });
        }

        const existingPaymentResult = await client.query(
            `SELECT
                id,
                contract_id,
                amount,
                provider_order_reference,
                status
             FROM contract_payments
             WHERE idempotency_key = $1
             FOR UPDATE`,
            [idempotencyKey],
        );

        if (existingPaymentResult.rowCount > 0) {
            const existingPayment = existingPaymentResult.rows[0];

            if (String(existingPayment.contract_id) !== String(contract.id)) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    success: false,
                    message:
                        "Idempotency-Key has already been used for a different contract",
                });
            }

            if (!existingPayment.provider_order_reference) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    success: false,
                    message:
                        "Order creation is already in progress or requires reconciliation",
                });
            }

            const existingAmountPaise = convertRupeesToPaise(
                existingPayment.amount,
            );

            if (existingAmountPaise === null) {
                throw new Error("Stored payment amount is invalid");
            }

            await client.query("COMMIT");

            return res.status(200).json({
                success: true,
                data: {
                    ...frontendOrderDetails(
                        {
                            ...existingPayment,
                            amount_paise: existingAmountPaise,
                        },
                        keyId,
                    ),
                },
            });
        }

        const inProgressResult = await client.query(
            `SELECT id
             FROM contract_payments
             WHERE contract_id = $1
               AND status IN ('created', 'funding_pending')
             LIMIT 1
             FOR UPDATE`,
            [contract.id],
        );

        if (inProgressResult.rowCount > 0) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message:
                    "A payment order already exists or requires reconciliation for this contract",
            });
        }

        const paymentResult = await client.query(
            `INSERT INTO contract_payments (
                contract_id,
                client_id,
                freelancer_id,
                amount,
                agreed_amount_snapshot,
                currency,
                provider,
                idempotency_key,
                status
             )
             VALUES ($1, $2, $3, $4, $4, $5, $6, $7, 'created')
             RETURNING id`,
            [
                contract.id,
                contract.client_id,
                contract.freelancer_id,
                contract.agreed_amount,
                PAYMENT_CURRENCY,
                PAYMENT_PROVIDER,
                idempotencyKey,
            ],
        );

        payment = {
            id: paymentResult.rows[0].id,
            amount: contract.agreed_amount,
            amount_paise: amountPaise,
        };

        await client.query(
            `INSERT INTO contract_payment_events (
                contract_payment_id,
                provider,
                source,
                event_type,
                amount,
                currency,
                event_data
             )
             VALUES ($1, $2, 'system', 'order_creation_started', $3, $4, $5)`,
            [
                payment.id,
                PAYMENT_PROVIDER,
                contract.agreed_amount,
                PAYMENT_CURRENCY,
                JSON.stringify({ contract_id: String(contract.id) }),
            ],
        );

        await client.query("COMMIT");
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Payment order rollback error:", rollbackError);
            }
        }

        console.error("Payment order setup error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to prepare payment order",
        });
    } finally {
        client?.release();
    }

    let razorpayOrder;

    try {
        razorpayOrder = await createRazorpayOrder({
            amount: payment.amount_paise,
            currency: PAYMENT_CURRENCY,
            receipt: `tbp_${payment.id}`,
            notes: {
                contract_id: String(contractId),
                payment_id: String(payment.id),
            },
        });

        if (!razorpayOrder?.id) {
            throw new Error("Razorpay did not return an order ID");
        }
    } catch (error) {
        try {
            await pool.query(
                `INSERT INTO contract_payment_events (
                    contract_payment_id,
                    provider,
                    source,
                    event_type,
                    amount,
                    currency,
                    event_data
                 )
                 VALUES ($1, $2, 'system', 'order_creation_outcome_unknown', $3, $4, $5)`,
                [
                    payment.id,
                    PAYMENT_PROVIDER,
                    payment.amount,
                    PAYMENT_CURRENCY,
                    JSON.stringify({ outcome: "unknown" }),
                ],
            );
        } catch (eventError) {
            console.error(
                "Payment order outcome event could not be recorded:",
                eventError.message,
            );
        }

        console.error("Razorpay order creation failed");
        return res.status(502).json({
            success: false,
            message:
                "Payment order could not be confirmed; the attempt requires reconciliation",
        });
    }

    let updateClient;
    let committed = false;

    try {
        updateClient = await pool.connect();
        await updateClient.query("BEGIN");

        const updatedPayment = await updateClient.query(
            `UPDATE contract_payments
             SET provider_order_reference = $2,
                 status = 'funding_pending',
                 updated_at = NOW()
             WHERE id = $1
               AND provider_order_reference IS NULL
             RETURNING id, amount`,
            [payment.id, razorpayOrder.id],
        );

        if (updatedPayment.rowCount !== 1) {
            throw new Error("Payment order could not be persisted");
        }

        await updateClient.query(
            `INSERT INTO contract_payment_events (
                contract_payment_id,
                provider,
                source,
                event_type,
                amount,
                currency,
                event_data
             )
             VALUES ($1, $2, 'system', 'order_created', $3, $4, $5)`,
            [
                payment.id,
                PAYMENT_PROVIDER,
                updatedPayment.rows[0].amount,
                PAYMENT_CURRENCY,
                JSON.stringify({ order_id: razorpayOrder.id }),
            ],
        );

        await updateClient.query("COMMIT");
        committed = true;

        return res.status(201).json({
            success: true,
            data: {
                ...frontendOrderDetails(
                    {
                        id: payment.id,
                        provider_order_reference: razorpayOrder.id,
                        amount_paise: payment.amount_paise,
                    },
                    keyId,
                ),
            },
        });
    } catch (error) {
        if (updateClient && !committed) {
            try {
                await updateClient.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Payment order persistence rollback error:", rollbackError);
            }
        }

        console.error("Razorpay order persistence error:", error.message);
        return res.status(500).json({
            success: false,
            message:
                "Payment order was created but could not be recorded; the attempt requires reconciliation",
        });
    } finally {
        updateClient?.release();
    }
};

const verifyContractPayment = async (req, res) => {
    const {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
    } = req.body || {};

    if (
        typeof orderId !== "string" ||
        !orderId.trim() ||
        typeof paymentId !== "string" ||
        !paymentId.trim() ||
        typeof signature !== "string" ||
        !signature.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: "Razorpay order, payment, and signature are required",
        });
    }

    if (req.user.role !== "client") {
        return res.status(403).json({
            success: false,
            message: "Only the contract client can verify payment",
        });
    }

    if (
        !process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") ||
        !process.env.RAZORPAY_KEY_SECRET?.trim()
    ) {
        return res.status(503).json({
            success: false,
            message: "Razorpay test-mode credentials are not configured",
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const paymentResult = await client.query(
            `SELECT
                cp.id,
                cp.contract_id,
                cp.client_id,
                cp.freelancer_id,
                cp.amount,
                cp.currency,
                cp.provider_order_reference,
                cp.provider_payment_reference,
                cp.status,
                c.client_id AS contract_client_id
             FROM contract_payments cp
             JOIN contracts c
               ON c.id = cp.contract_id
             WHERE cp.provider = $1
               AND cp.provider_order_reference = $2
             FOR UPDATE OF cp`,
            [PAYMENT_PROVIDER, orderId],
        );

        if (paymentResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Payment order not found",
            });
        }

        const payment = paymentResult.rows[0];

        if (
            Number(payment.client_id) !== Number(req.user.id) ||
            Number(payment.contract_client_id) !== Number(req.user.id)
        ) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                success: false,
                message: "You do not have permission to verify this payment",
            });
        }

        let signatureIsValid = false;
        try {
            signatureIsValid = verifyRazorpayPaymentSignature({
                orderId,
                paymentId,
                signature,
            });
        } catch {
            await client.query("ROLLBACK");
            return res.status(503).json({
                success: false,
                message: "Razorpay test-mode credentials are not configured",
            });
        }

        if (!signatureIsValid) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                message: "Razorpay payment signature is invalid",
            });
        }

        if (payment.provider_payment_reference === paymentId) {
            await client.query("COMMIT");
            return res.status(200).json({
                success: true,
                message:
                    "Payment signature already verified; provider confirmation is still pending",
                data: {
                    paymentId: String(payment.id),
                    status: payment.status,
                },
            });
        }

        if (
            payment.provider_payment_reference ||
            payment.status !== "funding_pending"
        ) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message: "Payment is not eligible for verification",
            });
        }

        const duplicatePaymentResult = await client.query(
            `SELECT id
             FROM contract_payments
             WHERE provider = $1
               AND provider_payment_reference = $2
             FOR UPDATE`,
            [PAYMENT_PROVIDER, paymentId],
        );

        if (
            duplicatePaymentResult.rowCount > 0 &&
            String(duplicatePaymentResult.rows[0].id) !== String(payment.id)
        ) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message: "Razorpay payment has already been associated",
            });
        }

        await client.query(
            `UPDATE contract_payments
             SET provider_payment_reference = $2,
                 status = 'funding_pending',
                 updated_at = NOW()
             WHERE id = $1`,
            [payment.id, paymentId],
        );

        await client.query(
            `INSERT INTO contract_payment_events (
                contract_payment_id,
                provider,
                provider_event_reference,
                source,
                event_type,
                amount,
                currency,
                event_data
             )
             VALUES ($1, $2, $3, 'api', 'checkout_signature_verified', $4, $5, $6)`,
            [
                payment.id,
                PAYMENT_PROVIDER,
                paymentId,
                payment.amount,
                payment.currency,
                JSON.stringify({
                    order_id: orderId,
                    verification: "signature_valid",
                }),
            ],
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message:
                "Payment signature verified; provider confirmation is still pending",
            data: {
                paymentId: String(payment.id),
                status: payment.status,
            },
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Payment verification rollback error:", rollbackError);
            }
        }

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Razorpay payment has already been associated",
            });
        }

        console.error("Payment verification error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to verify payment",
        });
    } finally {
        client?.release();
    }
};

module.exports = {
    createContractPaymentOrder,
    verifyContractPayment,
};
