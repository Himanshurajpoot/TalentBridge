const pool = require("../config/db");
const { createNotification } = require("../services/notificationService");

const createReview = async (req, res) => {
    const client = await pool.connect();

    try {
        const { projectId } = req.params;
        const { revieweeId, rating, comment } = req.body;
        const reviewerId = req.user.id;

        if (!revieweeId) {
            return res.status(400).json({
                success: false,
                message: "Reviewee ID is required",
            });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5",
            });
        }

        await client.query("BEGIN");

        const projectResult = await client.query(
            `SELECT
                id,
                client_id,
                status
             FROM projects
             WHERE id = $1
             FOR UPDATE`,
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Project not found",
            });
        }

        const project = projectResult.rows[0];

        if (project.status !== "completed") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Reviews can only be submitted for completed projects",
            });
        }

        if (Number(reviewerId) === Number(revieweeId)) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "You cannot review yourself",
            });
        }

        const proposalResult = await client.query(
            `SELECT
                freelancer_id
             FROM proposals
             WHERE project_id = $1
               AND status = 'accepted'
             LIMIT 1`,
            [projectId]
        );

        if (proposalResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "No accepted freelancer found for this project",
            });
        }

        const freelancerId =
            proposalResult.rows[0].freelancer_id;

        const isClient =
            Number(reviewerId) === Number(project.client_id);

        const isAcceptedFreelancer =
            Number(reviewerId) === Number(freelancerId);

        if (!isClient && !isAcceptedFreelancer) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                success: false,
                message: "You are not allowed to review participants of this project",
            });
        }

        if (
            (isClient && Number(revieweeId) !== Number(freelancerId)) ||
            (isAcceptedFreelancer &&
                Number(revieweeId) !== Number(project.client_id))
        ) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                success: false,
                message: "Invalid reviewee for this project",
            });
        }

        const existingReview = await client.query(
            `SELECT id
             FROM reviews
             WHERE reviewer_id = $1
               AND reviewee_id = $2
               AND project_id = $3`,
            [reviewerId, revieweeId, projectId]
        );

        if (existingReview.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message: "You have already reviewed this user for this project",
            });
        }

        const result = await client.query(
            `INSERT INTO reviews (
                reviewer_id,
                reviewee_id,
                project_id,
                rating,
                comment
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                reviewerId,
                revieweeId,
                projectId,
                rating,
                comment?.trim() || null,
            ]
        );

        await client.query("COMMIT");

        const reviewerResult = await pool.query(
            `SELECT full_name
             FROM users
             WHERE id = $1`,
            [reviewerId]
        );

        const reviewerName =
            reviewerResult.rows[0]?.full_name || "A user";

        await createNotification({
            userId: Number(revieweeId),
            type: "review_received",
            title: "New Review",
            message: `${reviewerName} left you a ${rating}-star review.`,
            referenceType: "project",
            referenceId: Number(projectId),
        });

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            data: {
                review: result.rows[0],
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create review error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    } finally {
        client.release();
    }
};

const getProjectReviews = async (req, res) => {
    try {
        const { projectId } = req.params;

        const result = await pool.query(
            `SELECT
                r.id,
                r.reviewer_id,
                r.reviewee_id,
                r.project_id,
                r.rating,
                r.comment,
                r.created_at,
                u.full_name AS reviewer_name
             FROM reviews r
             JOIN users u
                ON u.id = r.reviewer_id
             WHERE r.project_id = $1
             ORDER BY r.created_at DESC`,
            [projectId]
        );

        return res.status(200).json({
            success: true,
            data: {
                reviews: result.rows,
            },
        });
    } catch (error) {
        console.error("Get project reviews error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT
                r.id,
                r.reviewer_id,
                r.reviewee_id,
                r.project_id,
                r.rating,
                r.comment,
                r.created_at,
                u.full_name AS reviewer_name,
                p.title AS project_title
             FROM reviews r
             JOIN users u
                ON u.id = r.reviewer_id
             JOIN projects p
                ON p.id = r.project_id
             WHERE r.reviewee_id = $1
             ORDER BY r.created_at DESC`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: {
                reviews: result.rows,
            },
        });
    } catch (error) {
        console.error("Get user reviews error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    createReview,
    getProjectReviews,
    getUserReviews,
};