const express = require("express");

const {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} = require("../controllers/notificationController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/",
    authenticate,
    getMyNotifications
);

router.patch(
    "/read-all",
    authenticate,
    markAllNotificationsAsRead
);

router.patch(
    "/:id/read",
    authenticate,
    markNotificationAsRead
);

module.exports = router;