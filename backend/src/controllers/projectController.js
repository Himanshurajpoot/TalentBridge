const pool = require("../config/db");
const { createNotification } = require("../services/notificationService");

const createProject = async (req, res) => {
    try {
        const {
            companyId,
            title,
            description,
            budgetMin,
            budgetMax,
            experienceLevel,
            deadline,
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: "Title and description are required",
            });
        }

        if (
            budgetMin !== undefined &&
            budgetMin !== null &&
            budgetMax !== undefined &&
            budgetMax !== null &&
            Number(budgetMin) > Number(budgetMax)
        ) {
            return res.status(400).json({
                success: false,
                message: "Minimum budget cannot be greater than maximum budget",
            });
        }

        if (companyId) {
            const companyResult = await pool.query(
                `SELECT id
                 FROM companies
                 WHERE id = $1
                   AND owner_id = $2`,
                [companyId, req.user.id]
            );

            if (companyResult.rowCount === 0) {
                return res.status(403).json({
                    success: false,
                    message: "You do not own this company",
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO projects
                (
                    client_id,
                    company_id,
                    title,
                    description,
                    budget_min,
                    budget_max,
                    experience_level,
                    deadline
                )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                req.user.id,
                companyId || null,
                title,
                description,
                budgetMin || null,
                budgetMax || null,
                experienceLevel || null,
                deadline || null,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Project created successfully",
            data: {
                project: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Create project error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getProjects = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 10, 1),
            50
        );

        const offset = (page - 1) * limit;

        const {
            search,
            experienceLevel,
            minBudget,
            maxBudget,
        } = req.query;

        const conditions = ["p.status = 'open'"];
        const values = [];

        if (search) {
            values.push(`%${search}%`);

            conditions.push(
                `(p.title ILIKE $${values.length}
                 OR p.description ILIKE $${values.length})`
            );
        }

        if (experienceLevel) {
            values.push(experienceLevel);

            conditions.push(
                `p.experience_level = $${values.length}`
            );
        }

        if (minBudget) {
            values.push(Number(minBudget));

            conditions.push(
                `p.budget_max >= $${values.length}`
            );
        }

        if (maxBudget) {
            values.push(Number(maxBudget));

            conditions.push(
                `p.budget_min <= $${values.length}`
            );
        }

        const whereClause = conditions.join(" AND ");

        const countResult = await pool.query(
            `SELECT COUNT(*)
             FROM projects p
             WHERE ${whereClause}`,
            values
        );

        const total = Number(countResult.rows[0].count);

        const projectValues = [...values, limit, offset];

        const result = await pool.query(
            `SELECT
                p.id,
                p.client_id,
                p.company_id,
                p.title,
                p.description,
                p.budget_min,
                p.budget_max,
                p.experience_level,
                p.status,
                p.deadline,
                p.created_at,
                c.name AS company_name
             FROM projects p
             LEFT JOIN companies c
                ON c.id = p.company_id
             WHERE ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT $${projectValues.length - 1}
             OFFSET $${projectValues.length}`,
            projectValues
        );

        return res.status(200).json({
            success: true,
            data: {
                projects: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error("Get projects error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                p.id,
                p.client_id,
                p.company_id,
                p.title,
                p.description,
                p.budget_min,
                p.budget_max,
                p.experience_level,
                p.status,
                p.deadline,
                p.created_at,
                p.updated_at,
                c.name AS company_name,
                c.description AS company_description,

                COALESCE(
                    (
                        SELECT JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', s.id,
                                'name', s.name
                            )
                            ORDER BY s.name ASC
                        )
                        FROM project_skills ps
                        JOIN skills s
                            ON s.id = ps.skill_id
                        WHERE ps.project_id = p.id
                    ),
                    '[]'::json
                ) AS skills,

                EXISTS (
                    SELECT 1
                    FROM proposals pr
                    WHERE pr.project_id = p.id
                      AND pr.freelancer_id = $2
                      AND pr.status = 'accepted'
                ) AS is_accepted_freelancer

            FROM projects p
            LEFT JOIN companies c
                ON c.id = p.company_id
            WHERE p.id = $1`,
            [id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found",
            });
        }

        const project = result.rows[0];

        const canView =
            project.status === "open" ||
            req.user.role === "admin" ||
            project.client_id === req.user.id ||
            project.is_accepted_freelancer;

        if (!canView) {
            return res.status(403).json({
                success: false,
                message: "You do not have access to this project",
            });
        }

        delete project.is_accepted_freelancer;

        return res.status(200).json({
            success: true,
            data: {
                project,
            },
        });
    } catch (error) {
        console.error("Get project by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const addProjectSkill = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { skillId } = req.body;

        if (!skillId) {
            return res.status(400).json({
                success: false,
                message: "Skill ID is required",
            });
        }

        const projectResult = await pool.query(
            `SELECT id, client_id
             FROM projects
             WHERE id = $1`,
            [projectId]
        );

        if (projectResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found",
            });
        }

        if (
            req.user.role !== "admin" &&
            projectResult.rows[0].client_id !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                message: "You do not own this project",
            });
        }

        const skillResult = await pool.query(
            `SELECT id, name
             FROM skills
             WHERE id = $1`,
            [skillId]
        );

        if (skillResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Skill not found",
            });
        }

        const result = await pool.query(
            `INSERT INTO project_skills
                (project_id, skill_id)
             VALUES ($1, $2)
             RETURNING project_id, skill_id`,
            [projectId, skillId]
        );

        return res.status(201).json({
            success: true,
            message: "Skill added to project successfully",
            data: {
                projectSkill: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Add project skill error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Skill is already added to this project",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getProjectSkills = async (req, res) => {
    try {
        const { projectId } = req.params;

        const projectResult = await pool.query(
            `SELECT id
             FROM projects
             WHERE id = $1`,
            [projectId]
        );

        if (projectResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found",
            });
        }

        const result = await pool.query(
            `SELECT
                s.id,
                s.name
             FROM project_skills ps
             JOIN skills s
                ON s.id = ps.skill_id
             WHERE ps.project_id = $1
             ORDER BY s.name ASC`,
            [projectId]
        );

        return res.status(200).json({
            success: true,
            data: {
                skills: result.rows,
            },
        });
    } catch (error) {
        console.error("Get project skills error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getMyProjects = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.id,
                p.client_id,
                p.company_id,
                p.title,
                p.description,
                p.budget_min,
                p.budget_max,
                p.experience_level,
                p.status,
                p.deadline,
                p.created_at,
                p.updated_at,
                c.name AS company_name,

                (
                    SELECT COUNT(*)
                    FROM proposals pr
                    WHERE pr.project_id = p.id
                ) AS proposal_count

             FROM projects p

             LEFT JOIN companies c
                ON c.id = p.company_id

             WHERE p.client_id = $1

             ORDER BY p.created_at DESC`,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            data: {
                projects: result.rows,
            },
        });
    } catch (error) {
        console.error("Get my projects error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const completeProject = async (req, res) => {
    const client = await pool.connect();

    try {
        const { projectId } = req.params;

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
            project.client_id !== req.user.id
        ) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                success: false,
                message: "You can only complete your own projects",
            });
        }

        if (project.status === "completed") {
            await client.query("ROLLBACK");

            return res.status(200).json({
                success: true,
                message: "Project is already completed",
            });
        }

        if (project.status !== "in_progress") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Only in-progress projects can be completed",
            });
        }

        const acceptedProposalResult = await client.query(
            `SELECT
                id,
                freelancer_id
             FROM proposals
             WHERE project_id = $1
               AND status = 'accepted'
             LIMIT 1`,
            [projectId]
        );

        if (acceptedProposalResult.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Project does not have an accepted proposal",
            });
        }

        const freelancerId =
            acceptedProposalResult.rows[0].freelancer_id;

        const result = await client.query(
            `UPDATE projects
             SET status = 'completed',
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [projectId]
        );

        await client.query("COMMIT");

        await createNotification({
            userId: freelancerId,
            type: "project_completed",
            title: "Project Completed",
            message:
                "A project you were hired for has been marked as completed.",
            referenceType: "project",
            referenceId: projectId,
        });

        return res.status(200).json({
            success: true,
            message: "Project marked as completed successfully",
            data: {
                project: result.rows[0],
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Complete project error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    } finally {
        client.release();
    }
};

module.exports = {
    createProject,
    getProjects,
    getMyProjects,
    getProjectById,
    addProjectSkill,
    getProjectSkills,
    completeProject,
};