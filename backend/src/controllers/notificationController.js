const pool = require("../config/db");

const getMyNotifications = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                type,
                title,
                message,
                reference_type,
                reference_id,
                is_read,
                created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            data: {
                notifications: result.rows,
            },
        });
    } catch (error) {
        console.error("Get notifications error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE notifications
             SET is_read = true
             WHERE id = $1
               AND user_id = $2
             RETURNING *`,
            [id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: {
                notification: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Mark notification as read error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE notifications
             SET is_read = true
             WHERE user_id = $1
               AND is_read = false`,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            data: {
                updatedCount: result.rowCount,
            },
        });
    } catch (error) {
        console.error("Mark all notifications as read error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};