const jwt = require("jsonwebtoken");
const { io: createSocketClient } = require("socket.io-client");
const request = require("supertest");

const app = require("../src/app");
const pool = require("../src/config/db");
const { httpServer, io } = require("../server");

describe("Socket.IO authentication", () => {
    let serverUrl;
    let clientToken;
    let freelancerToken;
    let outsiderToken;
    let conversationId;
    const sockets = [];

    const createSocket = (token) => {
        const socket = createSocketClient(serverUrl, {
            auth: { token },
            autoConnect: false,
            reconnection: false,
            transports: ["websocket"],
        });
        sockets.push(socket);
        return socket;
    };

    const connectSocket = (socket) =>
        new Promise((resolve, reject) => {
            socket.once("connect", resolve);
            socket.once("connect_error", reject);
            socket.connect();
        });

    const emitWithAck = (socket, event, payload) =>
        new Promise((resolve) => {
            socket.emit(event, payload, resolve);
        });

    beforeAll(async () => {
        await new Promise((resolve) => {
            httpServer.listen(0, "127.0.0.1", resolve);
        });
        serverUrl = `http://127.0.0.1:${httpServer.address().port}`;

        const [clientLogin, freelancerLogin, outsiderLogin] =
            await Promise.all([
                request(app).post("/api/auth/login").send({
                    email: "client.test@example.com",
                    password: "ClientPassword123",
                }),
                request(app).post("/api/auth/login").send({
                    email: "himanshu.test@example.com",
                    password: "TestPassword123",
                }),
                request(app).post("/api/auth/login").send({
                    email: "freelancer2.test@example.com",
                    password: "TestPassword456",
                }),
            ]);

        expect(clientLogin.statusCode).toBe(200);
        expect(freelancerLogin.statusCode).toBe(200);
        expect(outsiderLogin.statusCode).toBe(200);

        clientToken = clientLogin.body.data.token;
        freelancerToken = freelancerLogin.body.data.token;
        outsiderToken = outsiderLogin.body.data.token;

        const members = await pool.query(
            `SELECT id, email
             FROM users
             WHERE email = ANY($1)`,
            [[
                "client.test@example.com",
                "himanshu.test@example.com",
            ]]
        );
        const memberIds = members.rows.map((member) => member.id);

        const conversation = await pool.query(
            "INSERT INTO conversations DEFAULT VALUES RETURNING id"
        );
        conversationId = conversation.rows[0].id;

        await pool.query(
            `INSERT INTO conversation_members (conversation_id, user_id)
             VALUES ($1, $2), ($1, $3)`,
            [conversationId, memberIds[0], memberIds[1]]
        );
    });

    afterAll(async () => {
        for (const socket of sockets) {
            socket.disconnect();
        }

        await new Promise((resolve) => io.close(resolve));

        if (conversationId) {
            await pool.query(
                "DELETE FROM conversations WHERE id = $1",
                [conversationId]
            );
        }
    });

    test("accepts a valid JWT and connects the socket", async () => {
        const socket = createSocket(clientToken);

        await connectSocket(socket);
        expect(socket.connected).toBe(true);
    });

    test("rejects an expired JWT during the handshake", async () => {
        const token = jwt.sign(
            { userId: 3, role: "client" },
            process.env.JWT_SECRET,
            { expiresIn: -1 }
        );
        const socket = createSocket(token);

        const connectionError = new Promise((resolve) => {
            socket.once("connect_error", resolve);
        });
        socket.connect();

        const error = await connectionError;
        expect(error.message).toMatch(/expired|invalid/i);
        expect(socket.connected).toBe(false);
    });

    test("disconnects a connected socket when its JWT expires", async () => {
        const token = jwt.sign(
            { userId: 3, role: "client" },
            process.env.JWT_SECRET,
            { expiresIn: "2s" }
        );
        const socket = createSocket(token);
        const disconnection = new Promise((resolve) => {
            socket.once("disconnect", resolve);
        });

        await connectSocket(socket);
        await expect(disconnection).resolves.toBe("io server disconnect");
        expect(socket.connected).toBe(false);
    });

    test("clears the expiry timer when a socket disconnects early", async () => {
        const token = jwt.sign(
            { userId: 3, role: "client" },
            process.env.JWT_SECRET,
            { expiresIn: "60s" }
        );
        const socket = createSocket(token);
        await connectSocket(socket);

        const serverSocket = io.of("/").sockets.get(socket.id);
        expect(serverSocket.data.authExpiryTimer).not.toBeNull();

        const disconnection = new Promise((resolve) => {
            serverSocket.once("disconnect", resolve);
        });
        socket.disconnect();
        await disconnection;

        expect(serverSocket.data.authExpiryTimer).toBeNull();
    });

    test("preserves conversation room and message membership checks", async () => {
        const memberSocket = createSocket(freelancerToken);
        const outsiderSocket = createSocket(outsiderToken);
        await Promise.all([
            connectSocket(memberSocket),
            connectSocket(outsiderSocket),
        ]);

        const memberJoin = await emitWithAck(
            memberSocket,
            "joinConversation",
            conversationId
        );
        const outsiderJoin = await emitWithAck(
            outsiderSocket,
            "joinConversation",
            conversationId
        );
        const outsiderMessages = await emitWithAck(
            outsiderSocket,
            "getConversationMessages",
            conversationId
        );
        const outsiderSend = await emitWithAck(
            outsiderSocket,
            "sendMessage",
            {
                conversationId,
                content: "Unauthorized message",
            }
        );

        expect(memberJoin.success).toBe(true);
        expect(outsiderJoin).toMatchObject({
            success: false,
            message: "You are not a member of this conversation",
        });
        expect(outsiderMessages).toMatchObject({
            success: false,
            message: "You are not a member of this conversation",
        });
        expect(outsiderSend).toMatchObject({
            success: false,
            message: "You are not a member of this conversation",
        });
    });
});
