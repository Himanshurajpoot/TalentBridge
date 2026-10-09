jest.mock("../src/config/db", () => ({
    connect: jest.fn(),
    query: jest.fn(),
}));

jest.mock("razorpay");

const pool = require("../src/config/db");
const Razorpay = require("razorpay");
const {
    createContractPaymentOrder,
} = require("../src/controllers/paymentController");

const lockTails = new Map();
let databaseState;
let originalKeyId;
let originalKeySecret;

const acquireLock = async (key, client) => {
    const previous = lockTails.get(key) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
        release = resolve;
    });
    lockTails.set(key, previous.then(() => current));
    await previous;
    client.locks.push(release);
};

const createFakeClient = () => {
    const client = {
        locks: [],
        undo: [],
        query: jest.fn(async (sql, params = []) => {
            const query = sql.replace(/\s+/g, " ").trim();

            if (query === "BEGIN") {
                client.undo = [];
                return { rowCount: null, rows: [] };
            }

            if (query === "COMMIT") {
                client.undo = [];
                client.locks.splice(0).forEach((release) => release());
                return { rowCount: null, rows: [] };
            }

            if (query === "ROLLBACK") {
                client.undo.splice(0).reverse().forEach((undo) => undo());
                client.locks.splice(0).forEach((release) => release());
                return { rowCount: null, rows: [] };
            }

            if (query.startsWith("SELECT pg_advisory_xact_lock")) {
                await acquireLock(`key:${params[0]}`, client);
                return { rowCount: 1, rows: [{}] };
            }

            if (query.startsWith("SELECT id, client_id, freelancer_id, agreed_amount, status FROM contracts")) {
                await acquireLock(`contract:${params[0]}`, client);
                const contract = databaseState.contracts.get(
                    String(params[0]),
                );
                return {
                    rowCount: contract ? 1 : 0,
                    rows: contract ? [{ ...contract }] : [],
                };
            }

            if (query.startsWith("SELECT id, contract_id, amount, provider_order_reference, status FROM contract_payments")) {
                const payment = [...databaseState.payments.values()].find(
                    (item) => item.idempotency_key === params[0],
                );
                return {
                    rowCount: payment ? 1 : 0,
                    rows: payment ? [{ ...payment }] : [],
                };
            }

            if (query.startsWith("SELECT id FROM contract_payments")) {
                const payment = [...databaseState.payments.values()].find(
                    (item) =>
                        String(item.contract_id) === String(params[0]) &&
                        ["created", "funding_pending"].includes(item.status),
                );
                return {
                    rowCount: payment ? 1 : 0,
                    rows: payment ? [{ id: payment.id }] : [],
                };
            }

            if (query.startsWith("INSERT INTO contract_payments")) {
                const [
                    contractId,
                    clientId,
                    freelancerId,
                    amount,
                    currency,
                    provider,
                    idempotencyKey,
                ] = params;
                const id = String(databaseState.nextPaymentId++);
                const payment = {
                    id,
                    contract_id: String(contractId),
                    client_id: clientId,
                    freelancer_id: freelancerId,
                    amount,
                    agreed_amount_snapshot: amount,
                    currency,
                    provider,
                    idempotency_key: idempotencyKey,
                    provider_order_reference: null,
                    status: "created",
                };
                databaseState.payments.set(id, payment);
                client.undo.push(() => databaseState.payments.delete(id));
                return { rowCount: 1, rows: [{ id }] };
            }

            if (query.startsWith("UPDATE contract_payments")) {
                const payment = databaseState.payments.get(String(params[0]));
                if (!payment || payment.provider_order_reference) {
                    return { rowCount: 0, rows: [] };
                }

                payment.provider_order_reference = params[1];
                payment.status = "funding_pending";
                client.undo.push(() => {
                    payment.provider_order_reference = null;
                    payment.status = "created";
                });
                return {
                    rowCount: 1,
                    rows: [{ id: payment.id, amount: payment.amount }],
                };
            }

            if (query.startsWith("INSERT INTO contract_payment_events")) {
                const event = {
                    contract_payment_id: String(params[0]),
                    provider: params[1],
                    source: query.includes("'provider_webhook'")
                        ? "provider_webhook"
                        : "system",
                    event_type: query.includes("order_creation_started")
                        ? "order_creation_started"
                        : query.includes("order_creation_outcome_unknown")
                        ? "order_creation_outcome_unknown"
                        : "order_created",
                    amount: params[2],
                    currency: params[3],
                    event_data:
                        typeof params[4] === "string"
                            ? JSON.parse(params[4])
                            : params[4],
                };
                databaseState.events.push(event);
                client.undo.push(() => {
                    const eventIndex = databaseState.events.indexOf(event);
                    if (eventIndex !== -1) {
                        databaseState.events.splice(eventIndex, 1);
                    }
                });
                return { rowCount: 1, rows: [] };
            }

            throw new Error(`Unexpected SQL in payment test: ${query}`);
        }),
        release: jest.fn(() => {
            client.locks.splice(0).forEach((release) => release());
        }),
    };

    return client;
};

const createResponse = () => {
    const response = {
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
    };

    return response;
};

const createRequest = (
    contractId,
    idempotencyKey,
    userId = 10,
    role = "client",
) => ({
    params: { contractId: String(contractId) },
    user: { id: userId, role },
    get: (header) =>
        header.toLowerCase() === "idempotency-key"
            ? idempotencyKey
            : undefined,
});

const invokeController = async (
    contractId,
    idempotencyKey,
    userId,
    role,
) => {
    const request = createRequest(contractId, idempotencyKey, userId, role);
    const response = createResponse();
    await createContractPaymentOrder(request, response);
    return response;
};

const seedContract = ({
    id,
    clientId = 10,
    freelancerId = 20,
    amount = "1234.56",
    status = "active",
} = {}) => {
    const contract = {
        id: String(id),
        client_id: clientId,
        freelancer_id: freelancerId,
        agreed_amount: amount,
        status,
    };
    databaseState.contracts.set(contract.id, contract);
    return contract;
};

describe("Contract payment order creation", () => {
    const createRazorpayOrder = jest.fn();

    beforeAll(() => {
        originalKeyId = process.env.RAZORPAY_KEY_ID;
        originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
    });

    beforeEach(() => {
        databaseState = {
            contracts: new Map(),
            payments: new Map(),
            events: [],
            nextPaymentId: 1,
        };
        lockTails.clear();
        pool.connect.mockImplementation(async () => createFakeClient());
        pool.query.mockImplementation(async (sql, params) => {
            const client = createFakeClient();
            try {
                return await client.query(sql, params);
            } finally {
                client.release();
            }
        });
        createRazorpayOrder.mockReset();
        createRazorpayOrder.mockResolvedValue({
            id: "order_test_123",
        });
        Razorpay.mockImplementation(() => ({
            orders: { create: createRazorpayOrder },
        }));
        process.env.RAZORPAY_KEY_ID = "rzp_test_public";
        process.env.RAZORPAY_KEY_SECRET = "test_secret";
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

    test("creates a TEST MODE order using the contract amount and participants", async () => {
        seedContract({ id: 101 });

        const response = await invokeController(101, "request-101");

        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({
            success: true,
            data: {
                paymentId: "1",
                razorpayOrderId: "order_test_123",
                amount: 123456,
                currency: "INR",
                keyId: "rzp_test_public",
            },
        });
        expect(JSON.stringify(response.body)).not.toContain("test_secret");
        expect(createRazorpayOrder).toHaveBeenCalledWith({
            amount: 123456,
            currency: "INR",
            receipt: "tbp_1",
            notes: {
                contract_id: "101",
                payment_id: "1",
            },
        });

        const payment = databaseState.payments.get("1");
        expect(payment).toMatchObject({
            contract_id: "101",
            client_id: 10,
            freelancer_id: 20,
            amount: "1234.56",
            agreed_amount_snapshot: "1234.56",
            currency: "INR",
            provider: "razorpay",
            idempotency_key: "request-101",
            provider_order_reference: "order_test_123",
            status: "funding_pending",
        });
        expect(databaseState.events.map((event) => event.event_type)).toEqual([
            "order_creation_started",
            "order_created",
        ]);
    });

    test("rejects a different authenticated client", async () => {
        seedContract({ id: 102 });

        const response = await invokeController(102, "request-102", 99);

        expect(response.statusCode).toBe(403);
        expect(createRazorpayOrder).not.toHaveBeenCalled();
        expect(databaseState.payments.size).toBe(0);
    });

    test("rejects a non-client role", async () => {
        seedContract({ id: 112 });

        const response = await invokeController(
            112,
            "request-112",
            10,
            "freelancer",
        );

        expect(response.statusCode).toBe(403);
        expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    test("returns 404 when the contract does not exist", async () => {
        const response = await invokeController(999, "request-999");

        expect(response.statusCode).toBe(404);
        expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    test("rejects contracts that are not active", async () => {
        seedContract({ id: 110, status: "completed" });

        const response = await invokeController(110, "request-110");

        expect(response.statusCode).toBe(409);
        expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    test("requires an idempotency key", async () => {
        seedContract({ id: 111 });

        const response = await invokeController(111, undefined);

        expect(response.statusCode).toBe(400);
        expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    test("rejects a non-positive contract amount", async () => {
        seedContract({ id: 103, amount: "0.00" });

        const response = await invokeController(103, "request-103");

        expect(response.statusCode).toBe(409);
        expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    test("rejects order creation when test credentials are missing", async () => {
        seedContract({ id: 104 });
        delete process.env.RAZORPAY_KEY_SECRET;

        const response = await invokeController(104, "request-104");

        expect(response.statusCode).toBe(503);
        expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    test("does not retry an uncertain Razorpay failure for the same key", async () => {
        seedContract({ id: 105 });
        createRazorpayOrder.mockRejectedValueOnce(
            new Error("provider timeout"),
        );
        const errorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const firstResponse = await invokeController(105, "request-105");
            const retryResponse = await invokeController(105, "request-105");

            expect(firstResponse.statusCode).toBe(502);
            expect(retryResponse.statusCode).toBe(409);
            expect(createRazorpayOrder).toHaveBeenCalledTimes(1);
            expect(
                databaseState.events.map((event) => event.event_type),
            ).toEqual([
                "order_creation_started",
                "order_creation_outcome_unknown",
            ]);
            expect(databaseState.payments.get("1").status).toBe("created");
        } finally {
            errorSpy.mockRestore();
        }
    });

    test("returns the same order for a repeated idempotency key", async () => {
        seedContract({ id: 106 });

        const firstResponse = await invokeController(106, "request-106");
        const repeatedResponse = await invokeController(106, "request-106");

        expect(firstResponse.statusCode).toBe(201);
        expect(repeatedResponse.statusCode).toBe(200);
        expect(repeatedResponse.body.data).toEqual(firstResponse.body.data);
        expect(createRazorpayOrder).toHaveBeenCalledTimes(1);
        expect(databaseState.payments.size).toBe(1);
    });

    test("rejects an idempotency key reused for a different contract", async () => {
        seedContract({ id: 107 });
        seedContract({ id: 108 });

        const firstResponse = await invokeController(107, "shared-key");
        const secondResponse = await invokeController(108, "shared-key");

        expect(firstResponse.statusCode).toBe(201);
        expect(secondResponse.statusCode).toBe(409);
        expect(createRazorpayOrder).toHaveBeenCalledTimes(1);
        expect(databaseState.payments.size).toBe(1);
    });

    test("serializes concurrent requests and creates at most one provider order", async () => {
        seedContract({ id: 109 });
        let resolveOrder;
        createRazorpayOrder.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveOrder = resolve;
                }),
        );

        const firstRequest = invokeController(109, "concurrent-key");
        for (let attempt = 0; attempt < 10 && !resolveOrder; attempt += 1) {
            await new Promise((resolve) => setImmediate(resolve));
        }
        expect(resolveOrder).toBeDefined();

        const secondRequest = invokeController(109, "concurrent-key");
        const secondResponse = await secondRequest;
        resolveOrder({ id: "order_concurrent_109" });
        const firstResponse = await firstRequest;

        expect([firstResponse.statusCode, secondResponse.statusCode].sort()).toEqual([
            201,
            409,
        ]);
        expect(createRazorpayOrder).toHaveBeenCalledTimes(1);
        expect(databaseState.payments.size).toBe(1);
    });
});
