const express = require("express");

const {
    createProject,
    getProjects,
    getMyProjects,
    getProjectById,
    addProjectSkill,
    getProjectSkills,
    completeProject,
} = require("../controllers/projectController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.get(
    "/",
    getProjects
);

router.get(
    "/my",
    authenticate,
    authorize("client", "admin"),
    getMyProjects
);

router.post(
    "/",
    authenticate,
    authorize("client", "admin"),
    createProject
);

router.post(
    "/:projectId/skills",
    authenticate,
    authorize("client", "admin"),
    addProjectSkill
);

router.get(
    "/:projectId/skills",
    getProjectSkills
);

router.patch(
    "/:projectId/complete",
    authenticate,
    authorize("client", "admin"),
    completeProject
);

router.get(
    "/:id",
    authenticate,
    getProjectById
);

module.exports = router;