const express = require("express");

const {
    createApplication,
    getJobApplications,
    updateApplicationStatus,
    getMyApplications,
} = require("../controllers/applicationController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/jobs/:jobId/applications",
    authenticate,
    createApplication
);

router.get(
    "/jobs/:jobId/applications",
    authenticate,
    getJobApplications
);

router.patch(
    "/jobs/:jobId/applications/:applicationId",
    authenticate,
    updateApplicationStatus
);

router.get(
    "/applications/me",
    authenticate,
    getMyApplications
);

module.exports = router;