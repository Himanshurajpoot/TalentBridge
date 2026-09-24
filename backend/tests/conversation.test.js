const request = require("supertest");

const app = require("../src/app");

const pool = require("../src/config/db");

describe("Conversation API", () => {
    let clientToken;
    let freelancerToken;
    let freelancerTwoToken;
    let conversationId;

    beforeAll(async () => {
        const clientLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "client.test@example.com",
                password: "ClientPassword123",
            });

        expect(clientLogin.statusCode).toBe(200);

        clientToken = clientLogin.body.data.token;

        const freelancerLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "himanshu.test@example.com",
                password: "TestPassword123",
            });

        expect(freelancerLogin.statusCode).toBe(200);

        freelancerToken = freelancerLogin.body.data.token;

        const freelancerTwoLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "freelancer2.test@example.com",
                password: "TestPassword456",
            });

        expect(freelancerTwoLogin.statusCode).toBe(200);

        freelancerTwoToken = freelancerTwoLogin.body.data.token;
    });

    beforeEach(async () => {
        await pool.query(
            `
            DELETE FROM conversations
            WHERE id IN (
                SELECT cm.conversation_id
                FROM conversation_members cm
                WHERE cm.user_id IN (2, 3, 4)
                GROUP BY cm.conversation_id
                HAVING COUNT(*) = 2
            )
            `
        );

        conversationId = null;
    });

    afterAll(async () => {
        if (conversationId) {
            await pool.query(
                "DELETE FROM conversations WHERE id = $1",
                [conversationId]
            );
        }
    });

    test("POST /api/conversations - should reject request without token", async () => {
        const response = await request(app)
            .post("/api/conversations")
            .send({
                userId: 2,
            });

        expect(response.statusCode).toBe(401);
    });

    test("POST /api/conversations - should reject missing userId", async () => {
        const response = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({});

        expect(response.statusCode).toBe(400);

        expect(response.body.message).toBe(
            "User ID is required"
        );
    });

    test("POST /api/conversations - should reject conversation with yourself", async () => {
        const response = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 3,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.message).toBe(
            "You cannot create a conversation with yourself"
        );
    });

    test("POST /api/conversations - should reject non-existent user", async () => {
        const response = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 999999,
            });

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            "User not found"
        );
    });

    test("POST /api/conversations - should create conversation", async () => {
        const response = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Conversation created successfully"
        );

        expect(response.body.data).toBeDefined();

        expect(
            response.body.data.conversationId
        ).toBeDefined();

        expect(
            response.body.data.conversation
        ).toBeDefined();

        expect(
            response.body.data.created
        ).toBe(true);

        conversationId =
            response.body.data.conversationId;
    });

    test("POST /api/conversations - should return existing conversation", async () => {
        const firstResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(firstResponse.statusCode).toBe(201);

        conversationId =
            firstResponse.body.data.conversationId;

        const secondResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                userId: 3,
            });

        expect(secondResponse.statusCode).toBe(200);

        expect(secondResponse.body.success).toBe(true);

        expect(secondResponse.body.message).toBe(
            "Conversation already exists"
        );

        expect(
            secondResponse.body.data
        ).toBeDefined();

        expect(
            secondResponse.body.data.conversationId
        ).toBe(conversationId);

        expect(
            secondResponse.body.data.created
        ).toBe(false);
    });

    test("GET /api/conversations - should reject request without token", async () => {
        const response = await request(app)
            .get("/api/conversations");

        expect(response.statusCode).toBe(401);
    });

    test("GET /api/conversations - client should get conversations", async () => {
        const createResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(createResponse.statusCode).toBe(201);

        conversationId =
            createResponse.body.data.conversationId;

        const response = await request(app)
            .get("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data).toBeDefined();

        expect(
            Array.isArray(
                response.body.data.conversations
            )
        ).toBe(true);

        expect(
            response.body.data.conversations.length
        ).toBeGreaterThanOrEqual(1);
    });

    test("GET /api/conversations - freelancer should get conversations", async () => {
        const createResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(createResponse.statusCode).toBe(201);

        conversationId =
            createResponse.body.data.conversationId;

        const response = await request(app)
            .get("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data).toBeDefined();

        expect(
            Array.isArray(
                response.body.data.conversations
            )
        ).toBe(true);

        expect(
            response.body.data.conversations.length
        ).toBeGreaterThanOrEqual(1);
    });

    test("GET /api/conversations/:conversationId/messages - should reject non-member", async () => {
        const createResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(createResponse.statusCode).toBe(201);

        conversationId =
            createResponse.body.data.conversationId;

        const response = await request(app)
            .get(
                `/api/conversations/${conversationId}/messages`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerTwoToken}`
            );

        expect(response.statusCode).toBe(403);

        expect(response.body.message).toBe(
            "You are not a member of this conversation"
        );
    });

    test("GET /api/conversations/:conversationId/messages - should return empty messages initially", async () => {
        const createResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(createResponse.statusCode).toBe(201);

        conversationId =
            createResponse.body.data.conversationId;

        const response = await request(app)
            .get(
                `/api/conversations/${conversationId}/messages`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data).toBeDefined();

        expect(
            Array.isArray(
                response.body.data.messages
            )
        ).toBe(true);

        expect(
            response.body.data.messages.length
        ).toBe(0);
    });

    test("POST /api/conversations/:conversationId/messages - should reject empty message", async () => {
        const createResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(createResponse.statusCode).toBe(201);

        conversationId =
            createResponse.body.data.conversationId;

        const response = await request(app)
            .post(
                `/api/conversations/${conversationId}/messages`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                content: "   ",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.message).toBe(
            "Message content is required"
        );
    });

    test("POST /api/conversations/:conversationId/messages - should reject non-member", async () => {
        const createResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(createResponse.statusCode).toBe(201);

        conversationId =
            createResponse.body.data.conversationId;

        const response = await request(app)
            .post(
                `/api/conversations/${conversationId}/messages`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerTwoToken}`
            )
            .send({
                content: "Hello",
            });

        expect(response.statusCode).toBe(403);

        expect(response.body.message).toBe(
            "You are not a member of this conversation"
        );
    });

    test("POST /api/conversations/:conversationId/messages - client should send message", async () => {
        const createResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(createResponse.statusCode).toBe(201);

        conversationId =
            createResponse.body.data.conversationId;

        const response = await request(app)
            .post(
                `/api/conversations/${conversationId}/messages`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                content: "Hello Freelancer",
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Message sent successfully"
        );

        expect(response.body.data).toBeDefined();

        expect(
            response.body.data.message
        ).toBeDefined();

        expect(
            response.body.data.message.content
        ).toBe("Hello Freelancer");
    });

    test("POST /api/conversations/:conversationId/messages - freelancer should send message", async () => {
        const createResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(createResponse.statusCode).toBe(201);

        conversationId =
            createResponse.body.data.conversationId;

        const response = await request(app)
            .post(
                `/api/conversations/${conversationId}/messages`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                content: "Hello Client",
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Message sent successfully"
        );

        expect(response.body.data).toBeDefined();

        expect(
            response.body.data.message
        ).toBeDefined();

        expect(
            response.body.data.message.content
        ).toBe("Hello Client");
    });

    test("GET /api/conversations/:conversationId/messages - should return both messages", async () => {
        const createResponse = await request(app)
            .post("/api/conversations")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                userId: 2,
            });

        expect(createResponse.statusCode).toBe(201);

        conversationId =
            createResponse.body.data.conversationId;

        const firstMessage = await request(app)
            .post(
                `/api/conversations/${conversationId}/messages`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                content: "Hello Freelancer",
            });

        expect(firstMessage.statusCode).toBe(201);

        const secondMessage = await request(app)
            .post(
                `/api/conversations/${conversationId}/messages`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                content: "Hello Client",
            });

        expect(secondMessage.statusCode).toBe(201);

        const response = await request(app)
            .get(
                `/api/conversations/${conversationId}/messages`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data).toBeDefined();

        expect(
            Array.isArray(
                response.body.data.messages
            )
        ).toBe(true);

        expect(
            response.body.data.messages.length
        ).toBe(2);

        expect(
            response.body.data.messages[0].content
        ).toBe("Hello Freelancer");

        expect(
            response.body.data.messages[1].content
        ).toBe("Hello Client");
    });
});