const express = require("express");

const {
    register,
    login,
    getMe,
} = require("../controllers/authController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
    loginRateLimiter,
} = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/register", register);

router.post(
    "/login",
    loginRateLimiter,
    login
);

router.get(
    "/me",
    authenticate,
    getMe
);

router.get(
    "/freelancer-only",
    authenticate,
    authorize("freelancer"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Welcome, freelancer!",
            user: req.user,
        });
    }
);

router.get(
    "/client-only",
    authenticate,
    authorize("client"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Welcome, client!",
            user: req.user,
        });
    }
);

module.exports = router;