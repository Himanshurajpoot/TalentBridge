const express = require("express");

const {
    createApplication,
    getJobApplications,
    updateApplicationStatus,
    getMyApplications,
} = require("../controllers/applicationController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

// Only freelancers can apply for jobs
router.post(
    "/jobs/:jobId/applications",
    authenticate,
    authorize("freelancer"),
    createApplication
);

router.get(
    "/jobs/:jobId/applications",
    authenticate,
    authorize("client", "admin"),
    getJobApplications
);

router.patch(
    "/jobs/:jobId/applications/:applicationId",
    authenticate,
    updateApplicationStatus
);

// Retain the status-suffixed URL while keeping application routes together.
router.patch(
    "/jobs/:jobId/applications/:applicationId/status",
    authenticate,
    authorize("client", "admin"),
    updateApplicationStatus
);

// Every authenticated user can view their own applications.
// The controller filters by req.user.id.
router.get(
    "/applications/me",
    authenticate,
    getMyApplications
);

module.exports = router;