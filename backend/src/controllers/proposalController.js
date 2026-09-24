const pool = require("../config/db");
const { createNotification } = require("../services/notificationService");

const createProposal = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { coverLetter, proposedBudget, estimatedDays } = req.body;

    if (!coverLetter || !coverLetter.trim()) {
      return res.status(400).json({
        success: false,
        message: "Cover letter is required",
      });
    }

    if (
      proposedBudget === undefined ||
      proposedBudget === null ||
      Number(proposedBudget) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid proposed budget is required",
      });
    }

    if (
      estimatedDays === undefined ||
      estimatedDays === null ||
      Number(estimatedDays) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Estimated days must be greater than 0",
      });
    }

    const projectResult = await pool.query(
      `SELECT id, client_id, title
             FROM projects
             WHERE id = $1
               AND status = 'open'`,
      [projectId],
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Open project not found",
      });
    }

    const project = projectResult.rows[0];

    const freelancerResult = await pool.query(
      `SELECT full_name
             FROM users
             WHERE id = $1`,
      [req.user.id],
    );

    if (freelancerResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Freelancer not found",
      });
    }

    const freelancerName = freelancerResult.rows[0].full_name;

    const existingProposal = await pool.query(
      `SELECT id
             FROM proposals
             WHERE project_id = $1
               AND freelancer_id = $2`,
      [projectId, req.user.id],
    );

    if (existingProposal.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a proposal for this project",
      });
    }

    const result = await pool.query(
      `INSERT INTO proposals
                (
                    project_id,
                    freelancer_id,
                    cover_letter,
                    proposed_budget,
                    estimated_days
                )
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
      [
        projectId,
        req.user.id,
        coverLetter.trim(),
        proposedBudget,
        estimatedDays,
      ],
    );

    const proposal = result.rows[0];

    await createNotification({
      userId: project.client_id,
      type: "proposal_submitted",
      title: "New Proposal",
      message: `${freelancerName} submitted a proposal for "${project.title}".`,
      referenceType: "project",
      referenceId: project.id,
    });

    return res.status(201).json({
      success: true,
      message: "Proposal submitted successfully",
      data: {
        proposal,
      },
    });
  } catch (error) {
    console.error("Create proposal error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getProjectProposals = async (req, res) => {
  try {
    const { projectId } = req.params;

    const projectResult = await pool.query(
      `SELECT id, client_id
             FROM projects
             WHERE id = $1`,
      [projectId],
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = projectResult.rows[0];

    if (
      req.user.role !== "admin" &&
      Number(project.client_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project's proposals",
      });
    }

    const result = await pool.query(
      `SELECT
                p.id,
                p.project_id,
                p.freelancer_id,
                p.cover_letter,
                p.proposed_budget,
                p.estimated_days,
                p.status,
                p.created_at,
                p.updated_at,
                u.full_name AS freelancer_name,
                u.email AS freelancer_email
             FROM proposals p
             JOIN users u
                ON u.id = p.freelancer_id
             WHERE p.project_id = $1
             ORDER BY p.created_at DESC`,
      [projectId],
    );

    return res.status(200).json({
      success: true,
      data: {
        proposals: result.rows,
      },
    });
  } catch (error) {
    console.error("Get project proposals error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateProposalStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { projectId, proposalId } = req.params;

    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "shortlisted",
      "accepted",
      "rejected",
      "withdrawn",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid proposal status",
      });
    }

    await client.query("BEGIN");

    const projectResult = await client.query(
      `SELECT
                id,
                client_id,
                status,
                title
             FROM projects
             WHERE id = $1
             FOR UPDATE`,
      [projectId],
    );

    if (projectResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = projectResult.rows[0];

    if (
      req.user.role !== "admin" &&
      Number(project.client_id) !== Number(req.user.id)
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this proposal",
      });
    }

    const proposalResult = await client.query(
      `SELECT
                id,
                project_id,
                freelancer_id,
                status
             FROM proposals
             WHERE id = $1
               AND project_id = $2
             FOR UPDATE`,
      [proposalId, projectId],
    );

    if (proposalResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Proposal not found",
      });
    }

    const proposal = proposalResult.rows[0];

    if (status === "accepted") {
      if (project.status !== "open" && project.status !== "in_progress") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "This project is no longer available for accepting proposals",
        });
      }

      const acceptedResult = await client.query(
        `SELECT id
                 FROM proposals
                 WHERE project_id = $1
                   AND status = 'accepted'
                   AND id <> $2`,
        [projectId, proposalId],
      );

      if (acceptedResult.rowCount > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "Another proposal has already been accepted for this project",
        });
      }

      const acceptedProposalResult = await client.query(
        `UPDATE proposals
                 SET status = 'accepted',
                     updated_at = NOW()
                 WHERE id = $1
                   AND project_id = $2
                 RETURNING *`,
        [proposalId, projectId],
      );

      await client.query(
        `UPDATE proposals
                 SET status = 'rejected',
                     updated_at = NOW()
                 WHERE project_id = $1
                   AND id <> $2
                   AND status IN ('pending', 'shortlisted')`,
        [projectId, proposalId],
      );

      await client.query(
        `UPDATE projects
                 SET status = 'in_progress',
                     updated_at = NOW()
                 WHERE id = $1`,
        [projectId],
      );

      await client.query("COMMIT");

      await createNotification({
        userId: proposal.freelancer_id,
        type: "proposal_accepted",
        title: "Proposal Accepted",
        message: `Your proposal for "${project.title}" has been accepted.`,
        referenceType: "project",
        referenceId: project.id,
      });
      return res.status(200).json({
        success: true,
        message: "Proposal accepted and project moved to in progress",
        data: {
          proposal: acceptedProposalResult.rows[0],
          project: {
            id: projectId,
            status: "in_progress",
          },
        },
      });
    }

    const result = await client.query(
      `UPDATE proposals
             SET status = $1,
                 updated_at = NOW()
             WHERE id = $2
               AND project_id = $3
             RETURNING *`,
      [status, proposalId, projectId],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Proposal status updated successfully",
      data: {
        proposal: result.rows[0],
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Update proposal status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
};

const getMyProposals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
                p.id,
                p.project_id,
                p.freelancer_id,
                p.cover_letter,
                p.proposed_budget,
                p.estimated_days,
                p.status,
                p.created_at,
                p.updated_at,
                pr.title AS project_title,
                pr.description AS project_description,
                pr.budget_min,
                pr.budget_max,
                pr.experience_level,
                pr.status AS project_status
             FROM proposals p
             JOIN projects pr
                ON pr.id = p.project_id
             WHERE p.freelancer_id = $1
             ORDER BY p.created_at DESC`,
      [req.user.id],
    );

    return res.status(200).json({
      success: true,
      data: {
        proposals: result.rows,
      },
    });
  } catch (error) {
    console.error("Get my proposals error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createProposal,
  getProjectProposals,
  updateProposalStatus,
  getMyProposals,
};
