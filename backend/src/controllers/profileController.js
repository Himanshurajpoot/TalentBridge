const pool = require("../config/db");

const getMyProfile = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.id,
                p.user_id,
                p.bio,
                p.headline,
                p.location,
                p.phone,
                p.avatar_url,
                p.resume_url,
                p.hourly_rate,
                p.experience_years,
                p.created_at,
                p.updated_at,

                u.full_name,
                u.email,
                u.role

             FROM profiles p
             JOIN users u ON u.id = p.user_id
             WHERE p.user_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Profile not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                profile: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


const upsertMyProfile = async (req, res) => {
    try {
        const {
            bio,
            headline,
            location,
            phone,
            avatarUrl,
            resumeUrl,
            hourlyRate,
            experienceYears,
        } = req.body;

        // Validate numeric fields
        if (
            hourlyRate != null &&
            (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "hourlyRate must be a valid non-negative number",
            });
        }

        if (
            experienceYears != null &&
            (isNaN(Number(experienceYears)) ||
                Number(experienceYears) < 0)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "experienceYears must be a valid non-negative number",
            });
        }

        const result = await pool.query(
            `INSERT INTO profiles (
                user_id,
                bio,
                headline,
                location,
                phone,
                avatar_url,
                resume_url,
                hourly_rate,
                experience_years
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (user_id)
            DO UPDATE SET
                bio = EXCLUDED.bio,
                headline = EXCLUDED.headline,
                location = EXCLUDED.location,
                phone = EXCLUDED.phone,
                avatar_url = EXCLUDED.avatar_url,
                resume_url = EXCLUDED.resume_url,
                hourly_rate = EXCLUDED.hourly_rate,
                experience_years = EXCLUDED.experience_years,
                updated_at = NOW()
            RETURNING *`,
            [
                req.user.id,
                bio?.trim() || null,
                headline?.trim() || null,
                location?.trim() || null,
                phone?.trim() || null,
                avatarUrl?.trim() || null,
                resumeUrl?.trim() || null,
                hourlyRate ?? null,
                experienceYears ?? null,
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Profile saved successfully",
            data: {
                profile: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Save profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    getMyProfile,
    upsertMyProfile,
};