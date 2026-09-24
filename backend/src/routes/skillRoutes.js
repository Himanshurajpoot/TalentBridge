const express = require("express");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const {
    getSkills,
    createSkill,
    addMySkill,
} = require("../controllers/skillController");

const router = express.Router();

// Public: get available skills
router.get("/", getSkills);

// Admin only: create a global skill
router.post(
    "/",
    authenticate,
    authorize("admin"),
    createSkill
);

// Authenticated users: add a skill to their own profile
router.post(
    "/profile/me",
    authenticate,
    addMySkill
);

module.exports = router;