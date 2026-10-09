jest.mock("../src/config/db", () => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
}));

const crypto = require("node:crypto");
const pool = require("../src/config/db");
const app = require("../src/app");
const request = require("supertest");

let payment;
let events;
let failEventInsert;
let originalKeyId;
let originalKeySecret;

const createClient = () => {
    let transactionSnapshot;

    return {
        query: jest.fn(async (sql, params = []) => {
            const query = sql.replace(/\s+/g, " ").trim();

            if (query === "BEGIN") {
                transactionSnapshot = {
                    payment: payment ? { ...payment } : null,
                    events: events.map((event) => ({ ...event })),
                };
                return { rowCount: null, rows: [] };
            }

            if (query === "COMMIT") {
                transactionSnapshot = null;
                return { rowCount: null, rows: [] };
            }

            if (query === "ROLLBACK") {
                if (transactionSnapshot) {
                    payment = transactionSnapshot.payment;
                    events = transactionSnapshot.events;
                    transactionSnapshot = null;
                }
                return { rowCount: null, rows: [] };
            }

            if (query.startsWith("SELECT id FROM contract_payment_events")) {
                const existing = events.find(
                    (event) =>
                        event.provider === params[0] &&
                        event.provider_event_reference === params[1],
                );
                return {
                    rowCount: existing ? 1 : 0,
                    rows: existing ? [{ id: existing.id }] : [],
                };
            }

            if (query.includes("FROM contract_payments") &&
                query.includes("provider_order_reference = $2")) {
                const matches =
                    payment &&
                    payment.provider === params[0] &&
                    (payment.provider_order_reference === params[1] ||
                        payment.provider_payment_reference === params[2]);
                return {
                    rowCount: matches ? 1 : 0,
                    rows: matches ? [{ ...payment }] : [],
                };
            }

            if (
                query.startsWith("SELECT id FROM contract_payments") &&
                query.includes("provider_payment_reference = $2")
            ) {
                return { rowCount: 0, rows: [] };
            }

            if (query.startsWith("UPDATE contract_payments")) {
                payment.status = "funded";
                payment.provider_payment_reference = params[1];
                return { rowCount: 1, rows: [] };
            }

            if (query.startsWith("INSERT INTO contract_payment_events")) {
                if (failEventInsert) {
                    throw new Error("Forced event insert failure");
                }

                const duplicate = events.some(
                    (event) =>
                        event.provider === params[1] &&
                        event.provider_event_reference === params[2],
                );
                if (duplicate) {
                    const error = new Error("duplicate event");
                    error.code = "23505";
                    throw error;
                }

                events.push({
                    id: String(events.length + 1),
                    contract_payment_id: String(params[0]),
                    provider: params[1],
                    provider_event_reference: params[2],
                    source: "provider_webhook",
                    event_type: "payment_captured",
                    amount: params[3],
                    currency: params[4],
                    event_data: JSON.parse(params[5]),
                    occurred_at: params[6],
                });
                return { rowCount: 1, rows: [] };
            }

            throw new Error(`Unexpected SQL in webhook test: ${query}`);
        }),
        release: jest.fn(),
    };
};

const capturedEvent = ({
    eventId = "evt_test_123",
    orderId = "order_test_123",
    paymentId = "pay_test_123",
    amount = 125000,
    currency = "INR",
    status = "captured",
    captured = true,
} = {}) => ({
    event: "payment.captured",
    created_at: 1791600000,
    payload: {
        payment: {
            entity: {
                id: paymentId,
                order_id: orderId,
                amount,
                currency,
                status,
                captured,
            },
        },
    },
});

const signRawBody = (body) =>
    crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

const postWebhook = async (
    rawBody,
    { signature = signRawBody(rawBody), eventId = "evt_test_123" } = {},
) =>
    request(app)
        .post("/api/contracts/payment-webhooks/razorpay")
        .set("Content-Type", "application/json")
        .set("x-razorpay-signature", signature)
        .set("x-razorpay-event-id", eventId)
        .send(rawBody);

const sendCapturedEvent = async (options = {}) => {
    const body = JSON.stringify(capturedEvent(options));
    return postWebhook(body, { eventId: options.eventId });
};

describe("Razorpay payment webhook", () => {
    beforeAll(() => {
        originalKeyId = process.env.RAZORPAY_KEY_ID;
        originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
    });

    beforeEach(() => {
        payment = {
            id: "51",
            contract_id: "61",
            client_id: 10,
            freelancer_id: 20,
            amount: "1250.00",
            currency: "INR",
            provider: "razorpay",
            provider_order_reference: "order_test_123",
            provider_payment_reference: null,
            status: "funding_pending",
        };
        events = [];
        failEventInsert = false;
        pool.connect.mockImplementation(async () => createClient());
        pool.connect.mockClear();
        process.env.RAZORPAY_KEY_ID = "rzp_test_webhook";
        process.env.RAZORPAY_KEY_SECRET = "webhook_test_secret";
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
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

    test("valid raw-body signature funds a matching captured payment", async () => {
        const rawBody = ` ${JSON.stringify(capturedEvent())}\n`;
        const response = await postWebhook(rawBody);

        expect(response.statusCode).toBe(200);
        expect(payment).toMatchObject({
            status: "funded",
            provider_payment_reference: "pay_test_123",
        });
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            provider_event_reference: "evt_test_123",
            event_type: "payment_captured",
            amount: "1250.00",
            currency: "INR",
            event_data: {
                order_id: "order_test_123",
                payment_id: "pay_test_123",
                payment_status: "captured",
                captured: true,
            },
        });
    });

    test("invalid webhook signature returns 400", async () => {
        const body = JSON.stringify(capturedEvent());
        const response = await postWebhook(body, {
            signature: "0".repeat(64),
        });

        expect(response.statusCode).toBe(400);
        expect(payment.status).toBe("funding_pending");
        expect(events).toHaveLength(0);
        expect(pool.connect).not.toHaveBeenCalled();
    });

    test("missing webhook signature returns 400", async () => {
        const body = JSON.stringify(capturedEvent());
        const response = await request(app)
            .post("/api/contracts/payment-webhooks/razorpay")
            .set("Content-Type", "application/json")
            .set("x-razorpay-event-id", "evt_test_123")
            .send(body);

        expect(response.statusCode).toBe(400);
        expect(payment.status).toBe("funding_pending");
    });

    test("malformed signature length returns 400", async () => {
        const body = JSON.stringify(capturedEvent());
        const response = await postWebhook(body, { signature: "abcd" });

        expect(response.statusCode).toBe(400);
        expect(payment.status).toBe("funding_pending");
        expect(pool.connect).not.toHaveBeenCalled();
    });

    test("malformed JSON with a valid raw-body signature returns 400", async () => {
        const body = '{"event":';
        const response = await postWebhook(body);

        expect(response.statusCode).toBe(400);
        expect(payment.status).toBe("funding_pending");
        expect(pool.connect).not.toHaveBeenCalled();
    });

    test("wrong amount is ignored without changing payment state", async () => {
        const response = await sendCapturedEvent({ amount: 125001 });

        expect(response.statusCode).toBe(200);
        expect(payment.status).toBe("funding_pending");
        expect(events).toHaveLength(0);
    });

    test("wrong currency is ignored without changing payment state", async () => {
        const response = await sendCapturedEvent({ currency: "USD" });

        expect(response.statusCode).toBe(200);
        expect(payment.status).toBe("funding_pending");
        expect(events).toHaveLength(0);
    });

    test("wrong order ID is ignored", async () => {
        const response = await sendCapturedEvent({ orderId: "order_wrong" });

        expect(response.statusCode).toBe(200);
        expect(payment.status).toBe("funding_pending");
        expect(events).toHaveLength(0);
    });

    test("unknown payment does not create a local payment", async () => {
        payment = null;
        const response = await sendCapturedEvent();

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Webhook event ignored");
        expect(payment).toBeNull();
        expect(events).toHaveLength(0);
    });

    test("duplicate webhook delivery creates only one ledger event", async () => {
        const first = await sendCapturedEvent();
        const duplicate = await sendCapturedEvent();

        expect(first.statusCode).toBe(200);
        expect(duplicate.statusCode).toBe(200);
        expect(payment.status).toBe("funded");
        expect(events).toHaveLength(1);
    });

    test("already funded payment remains funded for a new capture event", async () => {
        payment.status = "funded";
        payment.provider_payment_reference = "pay_test_123";

        const response = await sendCapturedEvent({ eventId: "evt_test_456" });

        expect(response.statusCode).toBe(200);
        expect(payment.status).toBe("funded");
        expect(events).toHaveLength(1);
    });

    test.each(["created", "failed", "refunded", "released", "cancelled"])(
        "does not fund payment in %s state",
        async (status) => {
            payment.status = status;

            const response = await sendCapturedEvent();

            expect(response.statusCode).toBe(200);
            expect(payment.status).toBe(status);
            expect(events).toHaveLength(0);
        },
    );

    test("rejects a payment ID associated with another payment", async () => {
        pool.connect.mockImplementationOnce(async () => {
            const client = createClient();
            const originalClientQuery = client.query;
            client.query = jest.fn(async (sql, params = []) => {
                const normalized = sql.replace(/\s+/g, " ").trim();
                if (
                    normalized.startsWith(
                        "SELECT id FROM contract_payments",
                    ) &&
                    normalized.includes("provider_payment_reference = $2")
                ) {
                    return { rowCount: 1, rows: [{ id: "99" }] };
                }
                return originalClientQuery(sql, params);
            });
            return client;
        });

        const response = await sendCapturedEvent();

        expect(response.statusCode).toBe(200);
        expect(payment.status).toBe("funding_pending");
        expect(events).toHaveLength(0);
    });

    test("webhook route does not require JWT authentication", async () => {
        const response = await sendCapturedEvent();

        expect(response.statusCode).toBe(200);
        expect(payment.status).toBe("funded");
    });

    test("rolls back the state transition if ledger insertion fails", async () => {
        failEventInsert = true;

        const response = await sendCapturedEvent();

        expect(response.statusCode).toBe(500);
        expect(payment.status).toBe("funding_pending");
        expect(payment.provider_payment_reference).toBeNull();
        expect(events).toHaveLength(0);
    });
});
