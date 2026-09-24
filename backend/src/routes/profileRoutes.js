const express = require("express");

const {
    getMyProfile,
    upsertMyProfile,
} = require("../controllers/profileController");

const {
    addMySkill,
    getMySkills,
    updateMySkill,
    removeMySkill,
} = require("../controllers/skillController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/me",
    authenticate,
    getMyProfile
);

router.put(
    "/me",
    authenticate,
    upsertMyProfile
);

router.post(
    "/me/skills",
    authenticate,
    addMySkill
);

router.get(
    "/me/skills",
    authenticate,
    getMySkills
);

router.patch(
    "/me/skills/:skillId",
    authenticate,
    updateMySkill
);

router.delete(
    "/me/skills/:skillId",
    authenticate,
    removeMySkill
);

module.exports = router;