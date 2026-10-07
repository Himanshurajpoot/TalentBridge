const express = require("express");

const {
    createJob,
    getJobs,
    getJobById,
    getMyJobs,
} = require("../controllers/jobController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();


// Get all open jobs
router.get("/", getJobs);

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

module.exports = router;