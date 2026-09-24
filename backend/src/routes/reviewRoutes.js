const express = require("express");

const {
    createReview,
    getProjectReviews,
    getUserReviews,
} = require("../controllers/reviewController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/projects/:projectId/reviews",
    authenticate,
    createReview
);

router.get(
    "/projects/:projectId/reviews",
    authenticate,
    getProjectReviews
);

router.get(
    "/users/:userId/reviews",
    authenticate,
    getUserReviews
);

module.exports = router;