const pool = require("../config/db");
const { createNotification } = require("../services/notificationService");

const contractDetailsQuery = `
    SELECT
        c.id,
        c.proposal_id,
        c.project_id,
        c.client_id,
        c.freelancer_id,
        c.agreed_amount,
        c.start_date,
        c.end_date,
        c.terms,
        c.status,
        c.created_at,
        c.updated_at,
        JSON_BUILD_OBJECT(
            'id', p.id::text,
            'title', p.title,
            'description', p.description,
            'status', p.status
        ) AS project,
        JSON_BUILD_OBJECT(
            'id', client.id,
            'name', client.full_name
        ) AS client,
        JSON_BUILD_OBJECT(
            'id', freelancer.id,
            'name', freelancer.full_name
        ) AS freelancer
    FROM contracts c
    JOIN projects p
        ON p.id = c.project_id
    JOIN users client
        ON client.id = c.client_id
    JOIN users freelancer
        ON freelancer.id = c.freelancer_id
`;

const getMyContracts = async (req, res) => {
    try {
        const result = await pool.query(
            `${contractDetailsQuery}
             WHERE c.client_id = $1
                OR c.freelancer_id = $1
             ORDER BY c.created_at DESC`,
            [req.user.id],
        );

        return res.status(200).json({
            success: true,
            data: {
                contracts: result.rows,
            },
        });
    } catch (error) {
        console.error("Get user contracts error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getContractById = async (req, res) => {
    try {
        const { contractId } = req.params;

        if (
            !/^[1-9]\d*$/.test(contractId) ||
            BigInt(contractId) > 9223372036854775807n
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid contract ID",
            });
        }

        const result = await pool.query(
            `${contractDetailsQuery}
             WHERE c.id = $1`,
            [contractId],
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Contract not found",
            });
        }

        const contract = result.rows[0];

        if (
            req.user.role !== "admin" &&
            Number(contract.client_id) !== Number(req.user.id) &&
            Number(contract.freelancer_id) !== Number(req.user.id)
        ) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this contract",
            });
        }

        const paymentResult = await pool.query(
            `SELECT
                id,
                amount,
                currency,
                provider,
                provider_order_reference,
                provider_payment_reference,
                status
             FROM contract_payments
             WHERE contract_id = $1
             ORDER BY
                CASE WHEN status = 'funded' THEN 0 ELSE 1 END,
                id DESC
             LIMIT 1`,
            [contract.id],
        );

        return res.status(200).json({
            success: true,
            data: {
                contract,
                payment: paymentResult.rows[0] || null,
            },
        });
    } catch (error) {
        console.error("Get contract error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const submitContractWork = async (req, res) => {
    const { contractId } = req.params;
    const { message, submission_url: submissionUrl } = req.body || {};

    if (
        !/^[1-9]\d*$/.test(contractId) ||
        BigInt(contractId) > 9223372036854775807n
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid contract ID",
        });
    }

    if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
            success: false,
            message: "Submission message is required",
        });
    }

    if (
        submissionUrl !== undefined &&
        submissionUrl !== null &&
        (typeof submissionUrl !== "string" || !submissionUrl.trim())
    ) {
        return res.status(400).json({
            success: false,
            message: "Submission URL must be a non-empty string when provided",
        });
    }

    let client;
    let transactionCommitted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const contractResult = await client.query(
            `SELECT
                id,
                client_id,
                freelancer_id,
                status
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

        if (Number(contract.freelancer_id) !== Number(req.user.id)) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                success: false,
                message: "Only the contract freelancer can submit work",
            });
        }

        if (contract.status !== "active") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message:
                    contract.status === "work_submitted"
                        ? "Work has already been submitted for this contract"
                        : "Only active contracts can accept a work submission",
            });
        }

        const submissionResult = await client.query(
            `INSERT INTO contract_work_submissions (
                contract_id,
                freelancer_id,
                message,
                submission_url
             )
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                contract.id,
                contract.freelancer_id,
                message.trim(),
                submissionUrl?.trim() || null,
            ],
        );

        await client.query(
            `UPDATE contracts
             SET status = 'work_submitted',
                 updated_at = NOW()
             WHERE id = $1`,
            [contract.id],
        );

        await client.query("COMMIT");
        transactionCommitted = true;

        try {
            await createNotification({
                userId: contract.client_id,
                type: "work_submitted",
                title: "Work Submitted",
                message: "The freelancer has submitted work for your contract.",
                referenceType: "contract",
                referenceId: contract.id,
            });
        } catch (notificationError) {
            console.error(
                "Work submission notification error:",
                notificationError,
            );
        }

        return res.status(201).json({
            success: true,
            message: "Work submitted successfully",
            data: {
                submission: submissionResult.rows[0],
            },
        });
    } catch (error) {
        if (client && !transactionCommitted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Work submission rollback error:",
                    rollbackError,
                );
            }
        }

        console.error("Submit contract work error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    } finally {
        client?.release();
    }
};

const completeContract = async (req, res) => {
    const { contractId } = req.params;

    if (
        !/^[1-9]\d*$/.test(contractId) ||
        BigInt(contractId) > 9223372036854775807n
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid contract ID",
        });
    }

    let client;
    let transactionCommitted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const contractResult = await client.query(
            `SELECT
                id,
                project_id,
                client_id,
                freelancer_id,
                status
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
        const isParticipant =
            Number(contract.client_id) === Number(req.user.id) ||
            Number(contract.freelancer_id) === Number(req.user.id);

        if (!isParticipant) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                success: false,
                message: "You do not have permission to complete this contract",
            });
        }

        if (contract.status !== "active") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message:
                    contract.status === "completed"
                        ? "Contract is already completed"
                        : "Only active contracts can be completed",
            });
        }

        const result = await client.query(
            `UPDATE contracts
             SET status = 'completed',
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [contractId],
        );

        const projectResult = await client.query(
            `UPDATE projects
             SET status = 'completed',
                 updated_at = NOW()
             WHERE id = $1
             RETURNING id, status`,
            [contract.project_id],
        );

        if (projectResult.rowCount === 0) {
            throw new Error("Contract project not found during completion");
        }

        await client.query("COMMIT");
        transactionCommitted = true;

        const otherParticipantId =
            Number(contract.client_id) === Number(req.user.id)
                ? contract.freelancer_id
                : contract.client_id;

        try {
            await createNotification({
                userId: otherParticipantId,
                type: "contract_completed",
                title: "Contract Completed",
                message: "A contract you are a participant in has been completed.",
                referenceType: "contract",
                referenceId: contract.id,
            });
        } catch (notificationError) {
            console.error(
                "Contract completion notification error:",
                notificationError,
            );
        }

        return res.status(200).json({
            success: true,
            message: "Contract completed successfully",
            data: {
                contract: result.rows[0],
            },
        });
    } catch (error) {
        if (client && !transactionCommitted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Contract completion rollback error:", rollbackError);
            }
        }

        console.error("Complete contract error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    } finally {
        client?.release();
    }
};

module.exports = {
    getMyContracts,
    getContractById,
    completeContract,
    submitContractWork,
};
