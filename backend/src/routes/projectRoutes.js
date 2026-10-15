const express = require("express");

const {
    createProject,
    getProjects,
    getMyProjects,
    getProjectById,
    addProjectSkill,
    getProjectSkills,
    completeProject,
    getUserPortfolioProjects,
} = require("../controllers/projectController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

const authenticateIfProvided = (req, res, next) => {
    if (!req.headers.authorization) {
        return next();
    }

    return authenticate(req, res, next);
};

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

router.get(
    "/user/:userId/portfolio",
    authenticate,
    getUserPortfolioProjects
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
    authenticateIfProvided,
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