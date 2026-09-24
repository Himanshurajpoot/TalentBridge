const express = require("express");

const {
    createConversation,
    getMyConversations,
    getConversationMessages,
    sendMessage,
} = require("../controllers/conversationController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/",
    authenticate,
    createConversation
);

router.get(
    "/",
    authenticate,
    getMyConversations
);

router.get(
    "/:conversationId/messages",
    authenticate,
    getConversationMessages
);

router.post(
    "/:conversationId/messages",
    authenticate,
    sendMessage
);

module.exports = router;