jest.mock("../src/config/db", () => ({
    connect: jest.fn(),
    end: jest.fn(),
}));

const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const pool = require("../src/config/db");
const app = require("../src/app");
const {
    verifyContractPayment,
} = require("../src/controllers/paymentController");

let payment;
let duplicatePayment;
let events;
let originalKeyId;
let originalKeySecret;

const createClient = () => ({
    query: jest.fn(async (sql, params = []) => {
        const query = sql.replace(/\s+/g, " ").trim();

        if (["BEGIN", "COMMIT", "ROLLBACK"].includes(query)) {
            return { rowCount: null, rows: [] };
        }

        if (query.includes("FROM contract_payments cp") &&
            query.includes("provider_order_reference = $2")) {
            if (
                payment &&
                payment.provider === params[0] &&
                payment.provider_order_reference === params[1]
            ) {
                return {
                    rowCount: 1,
                    rows: [{
                        ...payment,
                        contract_client_id: payment.client_id,
                    }],
                };
            }

            return { rowCount: 0, rows: [] };
        }

        if (
            query.startsWith("SELECT id FROM contract_payments") &&
            query.includes("provider_payment_reference = $2")
        ) {
            const duplicate =
                duplicatePayment?.provider === params[0] &&
                duplicatePayment.provider_payment_reference === params[1]
                    ? duplicatePayment
                    : payment?.provider === params[0] &&
                      payment.provider_payment_reference === params[1]
                    ? payment
                    : null;
            return {
                rowCount: duplicate ? 1 : 0,
                rows: duplicate ? [{ id: duplicate.id }] : [],
            };
        }

        if (query.startsWith("UPDATE contract_payments")) {
            payment.provider_payment_reference = params[1];
            return { rowCount: 1, rows: [] };
        }

        if (query.startsWith("INSERT INTO contract_payment_events")) {
            events.push({
                contract_payment_id: params[0],
                provider: params[1],
                provider_event_reference: params[2],
                source: "api",
                event_type: "checkout_signature_verified",
                amount: params[3],
                currency: params[4],
                event_data: JSON.parse(params[5]),
            });
            return { rowCount: 1, rows: [] };
        }

        throw new Error(`Unexpected SQL in verification test: ${query}`);
    }),
    release: jest.fn(),
});

const createResponse = () => ({
    statusCode: null,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

const makeSignature = (orderId, paymentId) =>
    crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

const invokeVerification = async ({
    userId = 10,
    role = "client",
    orderId = "order_test_123",
    paymentId = "pay_test_456",
    signature = makeSignature(orderId, paymentId),
} = {}) => {
    const req = {
        user: { id: userId, role },
        body: {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
        },
    };
    const res = createResponse();
    await verifyContractPayment(req, res);
    return res;
};

describe("Razorpay payment signature verification", () => {
    beforeAll(() => {
        originalKeyId = process.env.RAZORPAY_KEY_ID;
        originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
    });

    beforeEach(() => {
        payment = {
            id: "31",
            contract_id: "41",
            client_id: 10,
            freelancer_id: 20,
            amount: "1250.00",
            currency: "INR",
            provider: "razorpay",
            provider_order_reference: "order_test_123",
            provider_payment_reference: null,
            status: "funding_pending",
        };
        duplicatePayment = null;
        events = [];
        pool.connect.mockImplementation(async () => createClient());
        pool.connect.mockClear();
        process.env.RAZORPAY_KEY_ID = "rzp_test_public";
        process.env.RAZORPAY_KEY_SECRET = "verification_test_secret";
    });

    afterAll(() => {
        if (originalKeyId === undefined) {
            delete process.env.RAZORPAY_KEY_ID;
        } else {
            process.env.RAZORPAY_KEY_ID = originalKeyId;
        }

        if (originalKeySecret === undefined) {
            delete process.env.RAZORPAY_KEY_SECRET;
        } else {
            process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
        }
    });

    test("valid signature stores payment reference and one verification event", async () => {
        const response = await invokeVerification();

        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            data: {
                paymentId: "31",
                status: "funding_pending",
            },
        });
        expect(payment.provider_payment_reference).toBe("pay_test_456");
        expect(payment.status).toBe("funding_pending");
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            provider_event_reference: "pay_test_456",
            event_type: "checkout_signature_verified",
            event_data: {
                order_id: "order_test_123",
                verification: "signature_valid",
            },
        });
    });

    test("invalid signature does not change payment state", async () => {
        const response = await invokeVerification({
            signature: "0".repeat(64),
        });

        expect(response.statusCode).toBe(400);
        expect(payment.provider_payment_reference).toBeNull();
        expect(events).toHaveLength(0);
    });

    test("wrong order ID is not associated with the payment", async () => {
        const response = await invokeVerification({
            orderId: "order_wrong",
        });

        expect(response.statusCode).toBe(404);
        expect(payment.provider_payment_reference).toBeNull();
        expect(events).toHaveLength(0);
    });

    test("a different client cannot verify the payment", async () => {
        const response = await invokeVerification({ userId: 99 });

        expect(response.statusCode).toBe(403);
        expect(payment.provider_payment_reference).toBeNull();
        expect(events).toHaveLength(0);
    });

    test("non-client role cannot verify the payment", async () => {
        const response = await invokeVerification({ role: "freelancer" });

        expect(response.statusCode).toBe(403);
        expect(payment.provider_payment_reference).toBeNull();
    });

    test("missing required fields are rejected", async () => {
        const req = {
            user: { id: 10, role: "client" },
            body: {
                razorpay_order_id: "order_test_123",
                razorpay_payment_id: "pay_test_456",
            },
        };
        const res = createResponse();

        await verifyContractPayment(req, res);

        expect(res.statusCode).toBe(400);
        expect(payment.provider_payment_reference).toBeNull();
        expect(pool.connect).not.toHaveBeenCalled();
    });

    test("verification endpoint requires authentication", async () => {
        const response = await request(app).post(
            "/api/contracts/payment-verifications/razorpay",
        );

        expect(response.statusCode).toBe(401);
    });

    test("verification endpoint restricts access to client role", async () => {
        const token = jwt.sign(
            { userId: 20, role: "freelancer" },
            process.env.JWT_SECRET,
        );

        const response = await request(app)
            .post("/api/contracts/payment-verifications/razorpay")
            .set("Authorization", `Bearer ${token}`)
            .send({});

        expect(response.statusCode).toBe(403);
    });

    test("repeated valid verification is idempotent", async () => {
        const firstResponse = await invokeVerification();
        const repeatedResponse = await invokeVerification();

        expect(firstResponse.statusCode).toBe(200);
        expect(repeatedResponse.statusCode).toBe(200);
        expect(events).toHaveLength(1);
        expect(payment.provider_payment_reference).toBe("pay_test_456");
    });

    test("payment record not found returns 404", async () => {
        const storedPayment = payment;
        payment = null;

        const response = await invokeVerification();

        expect(response.statusCode).toBe(404);
        expect(storedPayment.provider_payment_reference).toBeNull();
        expect(events).toHaveLength(0);
    });

    test("payment ID already attached to a different payment is rejected", async () => {
        const storedPayment = payment;
        duplicatePayment = {
            ...storedPayment,
            id: "32",
            provider_payment_reference: "pay_duplicate",
        };

        const response = await invokeVerification({
            paymentId: "pay_duplicate",
        });

        expect(response.statusCode).toBe(409);
        expect(payment.provider_payment_reference).toBeNull();
        expect(duplicatePayment.provider_payment_reference).toBe(
            "pay_duplicate",
        );
        expect(events).toHaveLength(0);
    });

    test("signature verifier uses a fixed-length timing-safe comparison", async () => {
        const response = await invokeVerification({ signature: "short" });

        expect(response.statusCode).toBe(400);
        expect(payment.provider_payment_reference).toBeNull();
    });
});
