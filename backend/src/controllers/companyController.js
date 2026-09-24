const pool = require("../config/db");

const createCompany = async (req, res) => {
    try {
        const {
            name,
            description,
            websiteUrl,
            logoUrl,
            location,
            industry,
        } = req.body;

        // 1. Validate required field
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Company name is required",
            });
        }

        // 2. Create company
        const result = await pool.query(
            `
            INSERT INTO companies (
                owner_id,
                name,
                description,
                website_url,
                logo_url,
                location,
                industry
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *
            `,
            [
                req.user.id,
                name.trim(),
                description?.trim() || null,
                websiteUrl?.trim() || null,
                logoUrl?.trim() || null,
                location?.trim() || null,
                industry?.trim() || null,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Company created successfully",
            data: {
                company: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Create company error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


const getCompanies = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                description,
                website_url,
                logo_url,
                location,
                industry,
                created_at,
                updated_at
            FROM companies
            WHERE owner_id = $1
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            data: {
                companies: result.rows,
            },
        });
    } catch (error) {
        console.error("Get companies error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


module.exports = {
    createCompany,
    getCompanies,
};