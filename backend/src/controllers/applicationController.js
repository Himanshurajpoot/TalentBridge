const pool = require("../config/db");
const { createNotification } = require("../services/notificationService");

const createApplication = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { coverLetter, resumeUrl } = req.body;

        if (!coverLetter || !coverLetter.trim()) {
            return res.status(400).json({
                success: false,
                message: "Cover letter is required",
            });
        }

        const jobResult = await pool.query(
            `SELECT
                id,
                posted_by,
                title,
                status,
                application_deadline
             FROM jobs
             WHERE id = $1`,
            [jobId]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }

        const job = jobResult.rows[0];

        if (job.status !== "open") {
            return res.status(400).json({
                success: false,
                message: "This job is not accepting applications",
            });
        }

        const existingApplication = await pool.query(
            `SELECT id
             FROM applications
             WHERE job_id = $1
               AND applicant_id = $2`,
            [jobId, req.user.id]
        );

        if (existingApplication.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "You have already applied to this job",
            });
        }

        const result = await pool.query(
            `INSERT INTO applications (
                job_id,
                applicant_id,
                cover_letter,
                resume_url
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
                jobId,
                req.user.id,
                coverLetter.trim(),
                resumeUrl?.trim() || null,
            ]
        );

        const applicantResult = await pool.query(
            `SELECT full_name
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        const applicantName =
            applicantResult.rows[0]?.full_name || "A freelancer";

        await createNotification({
            userId: job.posted_by,
            type: "application_submitted",
            title: "New Application",
            message: `${applicantName} applied for "${job.title}".`,
            referenceType: "job",
            referenceId: job.id,
        });

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully",
            data: {
                application: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Create application error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getJobApplications = async (req, res) => {
    try {
        const { jobId } = req.params;

        const jobResult = await pool.query(
            `SELECT id, posted_by
             FROM jobs
             WHERE id = $1`,
            [jobId]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }

        const job = jobResult.rows[0];

        if (
            req.user.role !== "admin" &&
            job.posted_by !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                message: "You can only view applications for your own jobs",
            });
        }

        const result = await pool.query(
            `SELECT
                a.id,
                a.job_id,
                a.cover_letter,
                a.resume_url,
                a.status,
                a.applied_at,
                a.updated_at,
                u.id AS applicant_id,
                u.full_name AS applicant_name,
                u.email AS applicant_email
             FROM applications a
             JOIN users u
                ON u.id = a.applicant_id
             WHERE a.job_id = $1
             ORDER BY a.applied_at DESC`,
            [jobId]
        );

        return res.status(200).json({
            success: true,
            data: {
                applications: result.rows,
            },
        });
    } catch (error) {
        console.error("Get job applications error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const updateApplicationStatus = async (req, res) => {
    try {
        const { jobId, applicationId } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "reviewing",
            "shortlisted",
            "rejected",
            "accepted",
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid application status",
            });
        }

        const jobResult = await pool.query(
            `SELECT
                id,
                posted_by,
                title
             FROM jobs
             WHERE id = $1`,
            [jobId]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }

        const job = jobResult.rows[0];

        if (
            req.user.role !== "admin" &&
            job.posted_by !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                message: "You can only manage applications for your own jobs",
            });
        }

        const applicationResult = await pool.query(
            `SELECT
                id,
                applicant_id,
                status
             FROM applications
             WHERE id = $1
               AND job_id = $2`,
            [applicationId, jobId]
        );

        if (applicationResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Application not found",
            });
        }

        const application = applicationResult.rows[0];

        if (application.status === status) {
            return res.status(200).json({
                success: true,
                message: "Application status is already set to this value",
                data: {
                    application,
                },
            });
        }

        const result = await pool.query(
            `UPDATE applications
             SET status = $1,
                 updated_at = NOW()
             WHERE id = $2
               AND job_id = $3
             RETURNING *`,
            [status, applicationId, jobId]
        );

        await createNotification({
            userId: application.applicant_id,
            type: "application_status_updated",
            title: "Application Status Updated",
            message: `Your application for "${job.title}" is now ${status}.`,
            referenceType: "job",
            referenceId: job.id,
        });

        return res.status(200).json({
            success: true,
            message: "Application status updated successfully",
            data: {
                application: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Update application status error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getMyApplications = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                a.id,
                a.job_id,
                a.cover_letter,
                a.resume_url,
                a.status,
                a.applied_at,
                a.updated_at,
                j.title AS job_title,
                j.location,
                j.employment_type,
                j.experience_level,
                c.id AS company_id,
                c.name AS company_name
            FROM applications a
            JOIN jobs j
                ON j.id = a.job_id
            JOIN companies c
                ON c.id = j.company_id
            WHERE a.applicant_id = $1
            ORDER BY a.applied_at DESC
            `,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            data: {
                applications: result.rows,
            },
        });
    } catch (error) {
        console.error("Get my applications error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    createApplication,
    getJobApplications,
    updateApplicationStatus,
    getMyApplications,
};