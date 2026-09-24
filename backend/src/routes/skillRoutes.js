const express = require("express");
const authenticate = require("../middleware/authMiddleware");

const {
    getSkills,
    createSkill,
    addMySkill,
} = require("../controllers/skillController");

const router = express.Router();

router.get("/", getSkills);
router.post("/", createSkill);
router.post(
    "/profile/me",
    authenticate,
    addMySkill
);

module.exports = router;