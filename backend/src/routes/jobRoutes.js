const express = require("express");

const {
    createJob,
    getJobs,
    getJobById,
    getMyJobs,
} = require("../controllers/jobController");

const {
    createApplication,
    getJobApplications,
    updateApplicationStatus,
    getMyApplications,
} = require("../controllers/applicationController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();


// Get all open jobs
router.get("/", getJobs);


// Get applications submitted by the logged-in freelancer
router.get(
    "/applications/me",
    authenticate,
    authorize("freelancer"),
    getMyApplications
);


// Get jobs posted by the logged-in client
router.get(
    "/my",
    authenticate,
    authorize("client", "admin"),
    getMyJobs
);


// Get single job
router.get("/:id", getJobById);


// Create job
router.post(
    "/",
    authenticate,
    authorize("client", "admin"),
    createJob
);


// Apply to a job
router.post(
    "/:jobId/applications",
    authenticate,
    authorize("freelancer"),
    createApplication
);


// Get applications for a specific job
router.get(
    "/:jobId/applications",
    authenticate,
    authorize("client", "admin"),
    getJobApplications
);


// Update application status
router.patch(
    "/:jobId/applications/:applicationId/status",
    authenticate,
    authorize("client", "admin"),
    updateApplicationStatus
);


module.exports = router;