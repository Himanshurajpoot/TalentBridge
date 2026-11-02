const pool = require("../config/db");

let io = null;

const setSocketIO = (socketIO) => {
    io = socketIO;
};

const createNotification = async ({
    userId,
    type,
    title,
    message,
    referenceType = null,
    referenceId = null,
}) => {
    let result;
    try {
        result = await pool.query(
            `INSERT INTO notifications
            (
                user_id,
                type,
                title,
                message,
                reference_type,
                reference_id
            )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
            [
                userId,
                type,
                title,
                message,
                referenceType,
                referenceId,
            ]
        );
    } catch {
        console.error("Notification persistence failed");
        return null;
    }

    const notification = result.rows[0];

    if (io) {
        try {
            io.to(`user:${userId}`).emit(
                "newNotification",
                notification
            );
        } catch {
            console.error("Notification emission failed");
        }
    }

    return notification;
};

module.exports = {
    setSocketIO,
    createNotification,
};