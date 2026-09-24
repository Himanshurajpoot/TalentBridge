require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const app = require("./src/app");
const pool = require("./src/config/db");
const onlineUsers = new Map();

const PORT = process.env.PORT || 5001;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});

const notificationService = require("./src/services/notificationService");

notificationService.setSocketIO(io);

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(
                new Error("Authentication token required")
            );
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        socket.user = {
            id: decoded.userId,
            role: decoded.role,
        };

        next();
    } catch (error) {
        next(new Error("Invalid or expired token"));
    }
});

io.on("connection", (socket) => {
    console.log(
        `Socket connected: ${socket.id} | User: ${socket.user.id} | Role: ${socket.user.role}`
    );

    const userId = socket.user.id;

    const currentConnections =
        onlineUsers.get(userId) || 0;

    onlineUsers.set(
        userId,
        currentConnections + 1
    );

    console.log(
        `User ${userId} is now online with ${
            currentConnections + 1
        } connection(s)`
    );

    if (currentConnections === 0) {
        socket.broadcast.emit("userOnline", {
            userId,
        });
    }

    socket.join(`user:${socket.user.id}`);

    console.log(
        `User ${socket.user.id} joined room user:${socket.user.id}`
    );

    socket.on(
        "getMyConversations",
        async (callback) => {
            try {
                const result = await pool.query(
                    `
                    SELECT
                        c.id,
                        c.created_at,
                        c.updated_at,
                        COALESCE(
                            (
                                SELECT json_build_object(
                                    'id', m.id,
                                    'sender_id', m.sender_id,
                                    'content', m.content,
                                    'created_at', m.created_at
                                )
                                FROM messages m
                                WHERE m.conversation_id = c.id
                                ORDER BY m.created_at DESC
                                LIMIT 1
                            ),
                            'null'::json
                        ) AS last_message,
                        COALESCE(
                            (
                                SELECT json_agg(
                                    json_build_object(
                                        'id', u.id,
                                        'full_name', u.full_name,
                                        'email', u.email,
                                        'role', u.role
                                    )
                                    ORDER BY u.full_name ASC
                                )
                                FROM conversation_members cm
                                JOIN users u
                                    ON u.id = cm.user_id
                                WHERE cm.conversation_id = c.id
                                  AND cm.user_id != $1
                            ),
                            '[]'::json
                        ) AS participants
                    FROM conversations c
                    JOIN conversation_members current_member
                        ON current_member.conversation_id = c.id
                    WHERE current_member.user_id = $1
                    ORDER BY c.updated_at DESC
                    `,
                    [socket.user.id]
                );

                callback?.({
                    success: true,
                    conversations: result.rows,
                });
            } catch (error) {
                console.error(
                    "Get my conversations error:",
                    error
                );

                callback?.({
                    success: false,
                    message:
                        "Failed to load conversations",
                });
            }
        }
    );

    socket.on(
        "joinConversation",
        async (conversationId, callback) => {
            try {
                if (!conversationId) {
                    return callback?.({
                        success: false,
                        message:
                            "Conversation ID is required",
                    });
                }

                const result = await pool.query(
                    `
                    SELECT 1
                    FROM conversation_members
                    WHERE conversation_id = $1
                      AND user_id = $2
                    `,
                    [
                        conversationId,
                        socket.user.id,
                    ]
                );

                if (result.rowCount === 0) {
                    console.log(
                        `User ${socket.user.id} attempted to join unauthorized conversation:${conversationId}`
                    );

                    return callback?.({
                        success: false,
                        message:
                            "You are not a member of this conversation",
                    });
                }

                socket.join(
                    `conversation:${conversationId}`
                );

                console.log(
                    `User ${socket.user.id} joined conversation:${conversationId}`
                );

                callback?.({
                    success: true,
                    conversationId,
                });
            } catch (error) {
                console.error(
                    "Join conversation error:",
                    error
                );

                callback?.({
                    success: false,
                    message:
                        "Failed to join conversation",
                });
            }
        }
    );

    socket.on(
        "getConversationDetails",
        async (conversationId, callback) => {
            try {
                if (!conversationId) {
                    return callback?.({
                        success: false,
                        message:
                            "Conversation ID is required",
                    });
                }

                const memberResult =
                    await pool.query(
                        `
                        SELECT 1
                        FROM conversation_members
                        WHERE conversation_id = $1
                          AND user_id = $2
                        `,
                        [
                            conversationId,
                            socket.user.id,
                        ]
                    );

                if (memberResult.rowCount === 0) {
                    return callback?.({
                        success: false,
                        message:
                            "You are not a member of this conversation",
                    });
                }

                const result = await pool.query(
                    `
                    SELECT
                        u.id,
                        u.full_name,
                        u.email,
                        u.role
                    FROM conversation_members cm
                    JOIN users u
                        ON u.id = cm.user_id
                    WHERE cm.conversation_id = $1
                    ORDER BY u.full_name ASC
                    `,
                    [conversationId]
                );

                callback?.({
                    success: true,
                    conversationId,
                    members: result.rows,
                });
            } catch (error) {
                console.error(
                    "Get conversation details error:",
                    error
                );

                callback?.({
                    success: false,
                    message:
                        "Failed to load conversation details",
                });
            }
        }
    );

    socket.on(
        "getConversationMessages",
        async (conversationId, callback) => {
            try {
                if (!conversationId) {
                    return callback?.({
                        success: false,
                        message:
                            "Conversation ID is required",
                    });
                }

                const memberResult =
                    await pool.query(
                        `
                        SELECT 1
                        FROM conversation_members
                        WHERE conversation_id = $1
                          AND user_id = $2
                        `,
                        [
                            conversationId,
                            socket.user.id,
                        ]
                    );

                if (memberResult.rowCount === 0) {
                    return callback?.({
                        success: false,
                        message:
                            "You are not a member of this conversation",
                    });
                }

                const result = await pool.query(
                    `
                    SELECT
                        m.id,
                        m.conversation_id,
                        m.sender_id,
                        u.full_name AS sender_name,
                        m.content,
                        m.is_read,
                        m.created_at
                    FROM messages m
                    JOIN users u
                        ON u.id = m.sender_id
                    WHERE m.conversation_id = $1
                    ORDER BY m.created_at ASC
                    `,
                    [conversationId]
                );

                callback?.({
                    success: true,
                    messages: result.rows,
                });
            } catch (error) {
                console.error(
                    "Get conversation messages error:",
                    error
                );

                callback?.({
                    success: false,
                    message:
                        "Failed to load conversation messages",
                });
            }
        }
    );

    socket.on(
        "sendMessage",
        async ({ conversationId, content }, callback) => {
            try {
                if (
                    !conversationId ||
                    !content ||
                    !content.trim()
                ) {
                    return callback({
                        success: false,
                        message:
                            "Conversation ID and message content are required",
                    });
                }

                const memberResult = await pool.query(
                    `
                    SELECT 1
                    FROM conversation_members
                    WHERE conversation_id = $1
                      AND user_id = $2
                    `,
                    [
                        conversationId,
                        socket.user.id,
                    ]
                );

                if (memberResult.rowCount === 0) {
                    return callback({
                        success: false,
                        message:
                            "You are not a member of this conversation",
                    });
                }

                const senderResult = await pool.query(
                    `
                    SELECT full_name
                    FROM users
                    WHERE id = $1
                    `,
                    [socket.user.id]
                );

                const senderName =
                    senderResult.rows[0]?.full_name ||
                    "Someone";

                const result = await pool.query(
                    `
                    INSERT INTO messages
                        (
                            conversation_id,
                            sender_id,
                            content
                        )
                    VALUES
                        ($1, $2, $3)
                    RETURNING
                        id,
                        conversation_id,
                        sender_id,
                        content,
                        is_read,
                        created_at
                    `,
                    [
                        conversationId,
                        socket.user.id,
                        content.trim(),
                    ]
                );

                const message = {
                    ...result.rows[0],
                    sender_name: senderName,
                };

                await pool.query(
                    `
                    UPDATE conversations
                    SET updated_at = NOW()
                    WHERE id = $1
                    `,
                    [conversationId]
                );

                const membersResult = await pool.query(
                    `
                    SELECT user_id
                    FROM conversation_members
                    WHERE conversation_id = $1
                      AND user_id != $2
                    `,
                    [
                        conversationId,
                        socket.user.id,
                    ]
                );

                for (const member of membersResult.rows) {
                    await notificationService.createNotification(
                        {
                            userId: member.user_id,
                            type: "new_message",
                            title: "New Message",
                            message: `${senderName} sent you a new message.`,
                            referenceType:
                                "conversation",
                            referenceId:
                                conversationId,
                        }
                    );
                }

                io.to(
                    `conversation:${conversationId}`
                ).emit("newMessage", message);

                callback({
                    success: true,
                    message,
                });
            } catch (error) {
                console.error(
                    "Socket sendMessage error:",
                    error
                );

                callback({
                    success: false,
                    message:
                        "Failed to send message",
                });
            }
        }
    );

    socket.on(
        "markAsRead",
        async (messageId, callback) => {
            try {
                if (!messageId) {
                    return callback?.({
                        success: false,
                        message:
                            "Message ID is required",
                    });
                }

                const result = await pool.query(
                    `
                    UPDATE messages
                    SET is_read = true
                    WHERE id = $1
                      AND conversation_id IN (
                          SELECT conversation_id
                          FROM conversation_members
                          WHERE user_id = $2
                      )
                    RETURNING
                        id,
                        conversation_id,
                        sender_id,
                        content,
                        is_read,
                        created_at
                    `,
                    [
                        messageId,
                        socket.user.id,
                    ]
                );

                if (result.rowCount === 0) {
                    return callback?.({
                        success: false,
                        message:
                            "Message not found or access denied",
                    });
                }

                const message = result.rows[0];

                io.to(
                    `conversation:${message.conversation_id}`
                ).emit("messageRead", {
                    messageId: message.id,
                    readBy: socket.user.id,
                });

                callback?.({
                    success: true,
                    message,
                });
            } catch (error) {
                console.error(
                    "Mark message as read error:",
                    error
                );

                callback?.({
                    success: false,
                    message:
                        "Failed to mark message as read",
                });
            }
        }
    );

    socket.on("disconnect", () => {
        const userId = socket.user.id;

        const currentConnections =
            onlineUsers.get(userId) || 0;

        if (currentConnections <= 1) {
            onlineUsers.delete(userId);

            console.log(
                `User ${userId} is now offline`
            );

            socket.broadcast.emit("userOffline", {
                userId,
            });
        } else {
            onlineUsers.set(
                userId,
                currentConnections - 1
            );

            console.log(
                `User ${userId} disconnected one socket. Remaining connections: ${
                    currentConnections - 1
                }`
            );
        }
    });
});

httpServer.listen(
    PORT,
    "127.0.0.1",
    () => {
        console.log(
            `TalentBridge server running on http://127.0.0.1:${PORT}`
        );
    }
);

httpServer.on("error", (error) => {
    console.error(
        "SERVER ERROR:",
        error
    );
});