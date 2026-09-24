const pool = require("../config/db");

const getSkills = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                name
             FROM skills
             ORDER BY name ASC`
        );

        return res.status(200).json({
            success: true,
            data: {
                skills: result.rows,
            },
        });
    } catch (error) {
        console.error("Get skills error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const createSkill = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Skill name is required",
            });
        }

        const skillName = name.trim();

        const result = await pool.query(
            `INSERT INTO skills (name)
             VALUES ($1)
             RETURNING id, name`,
            [skillName]
        );

        return res.status(201).json({
            success: true,
            message: "Skill created successfully",
            data: {
                skill: result.rows[0],
            },
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Skill already exists",
            });
        }

        console.error("Create skill error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const addMySkill = async (req, res) => {
    try {
        const { skillId, proficiency } = req.body;

        if (!skillId) {
            return res.status(400).json({
                success: false,
                message: "skillId is required",
            });
        }

        const allowedProficiency = [
            "beginner",
            "intermediate",
            "advanced",
            "expert",
        ];

        if (
            proficiency &&
            !allowedProficiency.includes(proficiency)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid proficiency level",
            });
        }

        const skillResult = await pool.query(
            `SELECT id, name
             FROM skills
             WHERE id = $1`,
            [skillId]
        );

        if (skillResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Skill not found",
            });
        }

        const result = await pool.query(
            `INSERT INTO user_skills (
                user_id,
                skill_id,
                proficiency
            )
            VALUES ($1, $2, $3)
            RETURNING *`,
            [
                req.user.id,
                skillId,
                proficiency || null,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Skill added to profile",
            data: {
                userSkill: result.rows[0],
                skill: skillResult.rows[0],
            },
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Skill already added to your profile",
            });
        }

        console.error("Add skill error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getMySkills = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                s.id,
                s.name,
                us.proficiency
             FROM user_skills us
             JOIN skills s ON s.id = us.skill_id
             WHERE us.user_id = $1
             ORDER BY s.name ASC`,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            data: {
                skills: result.rows,
            },
        });
    } catch (error) {
        console.error("Get my skills error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const updateMySkill = async (req, res) => {
    try {
        const { skillId } = req.params;
        const { proficiency } = req.body;

        if (!skillId) {
            return res.status(400).json({
                success: false,
                message: "skillId is required",
            });
        }

        const allowedProficiency = [
            "beginner",
            "intermediate",
            "advanced",
            "expert",
        ];

        if (!proficiency) {
            return res.status(400).json({
                success: false,
                message: "proficiency is required",
            });
        }

        if (!allowedProficiency.includes(proficiency)) {
            return res.status(400).json({
                success: false,
                message: "Invalid proficiency level",
            });
        }

        const result = await pool.query(
            `UPDATE user_skills
             SET proficiency = $1
             WHERE user_id = $2
               AND skill_id = $3
             RETURNING user_id, skill_id, proficiency`,
            [
                proficiency,
                req.user.id,
                skillId,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Skill not found in your profile",
            });
        }

        const skillResult = await pool.query(
            `SELECT id, name
             FROM skills
             WHERE id = $1`,
            [skillId]
        );

        return res.status(200).json({
            success: true,
            message: "Skill proficiency updated successfully",
            data: {
                userSkill: result.rows[0],
                skill: skillResult.rows[0],
            },
        });
    } catch (error) {
        console.error("Update skill error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const removeMySkill = async (req, res) => {
    try {
        const { skillId } = req.params;

        if (!skillId) {
            return res.status(400).json({
                success: false,
                message: "skillId is required",
            });
        }

        const result = await pool.query(
            `DELETE FROM user_skills
             WHERE user_id = $1
               AND skill_id = $2
             RETURNING user_id, skill_id`,
            [req.user.id, skillId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Skill not found in your profile",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Skill removed from profile",
        });
    } catch (error) {
        console.error("Remove skill error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    getSkills,
    createSkill,
    addMySkill,
    getMySkills,
    updateMySkill,
    removeMySkill,
};