const pool = require("../config/db");

const createConversation = async (req, res) => {
    const client = await pool.connect();

    try {
        const { userId } = req.body;
        const currentUserId = req.user.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        if (Number(userId) === Number(currentUserId)) {
            return res.status(400).json({
                success: false,
                message: "You cannot create a conversation with yourself",
            });
        }

        await client.query("BEGIN");

        const userResult = await client.query(
            `SELECT id
             FROM users
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const existingResult = await client.query(
            `SELECT c.id
             FROM conversations c
             JOIN conversation_members cm
                ON cm.conversation_id = c.id
             GROUP BY c.id
             HAVING COUNT(*) = 2
                AND COUNT(*) FILTER (
                    WHERE cm.user_id = $1
                ) = 1
                AND COUNT(*) FILTER (
                    WHERE cm.user_id = $2
                ) = 1`,
            [currentUserId, userId]
        );

        if (existingResult.rowCount > 0) {
            await client.query("COMMIT");

            return res.status(200).json({
                success: true,
                message: "Conversation already exists",
                data: {
                    conversationId: existingResult.rows[0].id,
                    created: false,
                },
            });
        }

        const conversationResult = await client.query(
            `INSERT INTO conversations
             DEFAULT VALUES
             RETURNING id, created_at, updated_at`
        );

        const conversation = conversationResult.rows[0];

        await client.query(
            `INSERT INTO conversation_members
                (conversation_id, user_id)
             VALUES
                ($1, $2),
                ($1, $3)`,
            [
                conversation.id,
                currentUserId,
                userId,
            ]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Conversation created successfully",
            data: {
                conversation,
                conversationId: conversation.id,
                created: true,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Create conversation error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    } finally {
        client.release();
    }
};

const getMyConversations = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                c.id,
                c.created_at,
                c.updated_at,
                json_agg(
                    json_build_object(
                        'id', u.id,
                        'fullName', u.full_name,
                        'email', u.email
                    )
                    ORDER BY u.id
                ) AS members
             FROM conversations c
             JOIN conversation_members cm
                ON cm.conversation_id = c.id
             JOIN users u
                ON u.id = cm.user_id
             WHERE c.id IN (
                 SELECT conversation_id
                 FROM conversation_members
                 WHERE user_id = $1
             )
             GROUP BY c.id
             ORDER BY c.updated_at DESC`,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            data: {
                conversations: result.rows,
            },
        });
    } catch (error) {
        console.error(
            "Get conversations error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const memberResult = await pool.query(
            `SELECT conversation_id
             FROM conversation_members
             WHERE conversation_id = $1
               AND user_id = $2`,
            [conversationId, req.user.id]
        );

        if (memberResult.rowCount === 0) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this conversation",
            });
        }

        const result = await pool.query(
            `SELECT
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
             ORDER BY m.created_at ASC`,
            [conversationId]
        );

        return res.status(200).json({
            success: true,
            data: {
                messages: result.rows,
            },
        });
    } catch (error) {
        console.error(
            "Get conversation messages error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message content is required",
            });
        }

        const memberResult = await pool.query(
            `SELECT conversation_id
             FROM conversation_members
             WHERE conversation_id = $1
               AND user_id = $2`,
            [conversationId, req.user.id]
        );

        if (memberResult.rowCount === 0) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this conversation",
            });
        }

        const result = await pool.query(
            `INSERT INTO messages
                (conversation_id, sender_id, content)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [
                conversationId,
                req.user.id,
                content.trim(),
            ]
        );

        await pool.query(
            `UPDATE conversations
             SET updated_at = NOW()
             WHERE id = $1`,
            [conversationId]
        );

        return res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: {
                message: result.rows[0],
            },
        });
    } catch (error) {
        console.error(
            "Send message error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    createConversation,
    getMyConversations,
    getConversationMessages,
    sendMessage,
};