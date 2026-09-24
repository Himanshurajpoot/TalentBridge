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

// Job owner or admin authorization is handled
// inside the controller.
router.get(
    "/jobs/:jobId/applications",
    authenticate,
    getJobApplications
);

// Job owner or admin authorization is handled
// inside the controller.
router.patch(
    "/jobs/:jobId/applications/:applicationId",
    authenticate,
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