const pool = require("../config/db");

const isPositiveInteger = (value) => {
    return Number.isInteger(Number(value)) &&
        Number(value) > 0;
};

const isNonNegativeNumber = (value) => {
    if (value === null || value === undefined || value === "") {
        return false;
    }

    const number = Number(value);

    return Number.isFinite(number) && number >= 0;
};

const isValidDate = (value) => {
    if (!value) {
        return false;
    }

    const date = new Date(value);

    return !Number.isNaN(date.getTime());
};

const createJob = async (req, res) => {
    try {
        const {
            companyId,
            title,
            description,
            employmentType,
            experienceLevel,
            location,
            isRemote,
            salaryMin,
            salaryMax,
            applicationDeadline,
        } = req.body;

        if (
            companyId === undefined ||
            title === undefined ||
            description === undefined ||
            employmentType === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "companyId, title, description and employmentType are required",
            });
        }

        if (!isPositiveInteger(companyId)) {
            return res.status(400).json({
                success: false,
                message: "companyId must be a valid positive integer",
            });
        }

        if (
            typeof title !== "string" ||
            typeof description !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Title and description must be strings",
            });
        }

        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();

        if (!trimmedTitle || !trimmedDescription) {
            return res.status(400).json({
                success: false,
                message: "Title and description cannot be empty",
            });
        }

        if (trimmedTitle.length > 255) {
            return res.status(400).json({
                success: false,
                message: "Title must not exceed 255 characters",
            });
        }

        const allowedEmploymentTypes = [
            "full_time",
            "part_time",
            "contract",
            "internship",
            "freelance",
        ];

        if (
            typeof employmentType !== "string" ||
            !allowedEmploymentTypes.includes(
                employmentType
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid employment type",
            });
        }

        if (
            experienceLevel !== undefined &&
            experienceLevel !== null &&
            typeof experienceLevel !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "experienceLevel must be a string",
            });
        }

        if (
            location !== undefined &&
            location !== null &&
            typeof location !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "location must be a string",
            });
        }

        if (
            isRemote !== undefined &&
            typeof isRemote !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message: "isRemote must be a boolean",
            });
        }

        if (
            salaryMin !== undefined &&
            salaryMin !== null &&
            !isNonNegativeNumber(salaryMin)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "salaryMin must be a valid non-negative number",
            });
        }

        if (
            salaryMax !== undefined &&
            salaryMax !== null &&
            !isNonNegativeNumber(salaryMax)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "salaryMax must be a valid non-negative number",
            });
        }

        if (
            salaryMin !== undefined &&
            salaryMin !== null &&
            salaryMax !== undefined &&
            salaryMax !== null &&
            Number(salaryMin) > Number(salaryMax)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "salaryMin cannot be greater than salaryMax",
            });
        }

        if (
            applicationDeadline !== undefined &&
            applicationDeadline !== null
        ) {
            if (!isValidDate(applicationDeadline)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "applicationDeadline must be a valid date",
                });
            }

            if (
                new Date(applicationDeadline) <=
                new Date()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "applicationDeadline must be in the future",
                });
            }
        }

        const companyResult = await pool.query(
            "SELECT id, owner_id FROM companies WHERE id = $1",
            [Number(companyId)]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }

        if (
            req.user.role !== "admin" &&
            Number(companyResult.rows[0].owner_id) !==
                Number(req.user.id)
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You can only create jobs for your own company",
            });
        }

        const result = await pool.query(
            `INSERT INTO jobs (
                company_id,
                posted_by,
                title,
                description,
                employment_type,
                experience_level,
                location,
                is_remote,
                salary_min,
                salary_max,
                application_deadline
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *`,
            [
                Number(companyId),
                req.user.id,
                trimmedTitle,
                trimmedDescription,
                employmentType,
                experienceLevel
                    ? experienceLevel.trim()
                    : null,
                location ? location.trim() : null,
                isRemote ?? false,
                salaryMin !== undefined &&
                salaryMin !== null
                    ? Number(salaryMin)
                    : null,
                salaryMax !== undefined &&
                salaryMax !== null
                    ? Number(salaryMax)
                    : null,
                applicationDeadline || null,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Job created successfully",
            data: {
                job: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Create job error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getJobs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            employmentType,
            experienceLevel,
            isRemote,
            minSalary,
            maxSalary,
        } = req.query;

        if (
            page !== undefined &&
            (!Number.isInteger(Number(page)) ||
                Number(page) < 1)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "page must be a positive integer",
            });
        }

        if (
            limit !== undefined &&
            (!Number.isInteger(Number(limit)) ||
                Number(limit) < 1 ||
                Number(limit) > 50)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "limit must be between 1 and 50",
            });
        }

        const allowedEmploymentTypes = [
            "full_time",
            "part_time",
            "contract",
            "internship",
            "freelance",
        ];

        if (
            employmentType &&
            !allowedEmploymentTypes.includes(
                employmentType
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid employment type",
            });
        }

        if (
            isRemote !== undefined &&
            isRemote !== "true" &&
            isRemote !== "false"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "isRemote must be true or false",
            });
        }

        if (
            minSalary !== undefined &&
            !isNonNegativeNumber(minSalary)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "minSalary must be a valid non-negative number",
            });
        }

        if (
            maxSalary !== undefined &&
            !isNonNegativeNumber(maxSalary)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "maxSalary must be a valid non-negative number",
            });
        }

        if (
            minSalary !== undefined &&
            maxSalary !== undefined &&
            Number(minSalary) > Number(maxSalary)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "minSalary cannot be greater than maxSalary",
            });
        }

        if (
            search !== undefined &&
            typeof search !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "search must be a string",
            });
        }

        const pageNumber = Math.max(
            parseInt(page, 10) || 1,
            1
        );

        const limitNumber = Math.min(
            Math.max(parseInt(limit, 10) || 10, 1),
            50
        );

        const offset =
            (pageNumber - 1) * limitNumber;

        const conditions = ["j.status = 'open'"];
        const values = [];

        if (search?.trim()) {
            values.push(`%${search.trim()}%`);

            conditions.push(
                `(j.title ILIKE $${values.length} OR j.description ILIKE $${values.length})`
            );
        }

        if (employmentType) {
            values.push(employmentType);

            conditions.push(
                `j.employment_type = $${values.length}`
            );
        }

        if (experienceLevel) {
            values.push(experienceLevel);

            conditions.push(
                `j.experience_level = $${values.length}`
            );
        }

        if (isRemote !== undefined) {
            values.push(isRemote === "true");

            conditions.push(
                `j.is_remote = $${values.length}`
            );
        }

        if (minSalary !== undefined) {
            values.push(Number(minSalary));

            conditions.push(
                `j.salary_max >= $${values.length}`
            );
        }

        if (maxSalary !== undefined) {
            values.push(Number(maxSalary));

            conditions.push(
                `j.salary_min <= $${values.length}`
            );
        }

        const whereClause =
            conditions.join(" AND ");

        const countResult = await pool.query(
            `SELECT COUNT(*) AS total
             FROM jobs j
             WHERE ${whereClause}`,
            values
        );

        const total = Number(
            countResult.rows[0].total
        );

        values.push(limitNumber);
        const limitParam = values.length;

        values.push(offset);
        const offsetParam = values.length;

        const result = await pool.query(
            `SELECT
                j.id,
                j.title,
                j.description,
                j.employment_type,
                j.experience_level,
                j.location,
                j.is_remote,
                j.salary_min,
                j.salary_max,
                j.status,
                j.application_deadline,
                j.created_at,
                c.id AS company_id,
                c.name AS company_name,
                c.location AS company_location
             FROM jobs j
             JOIN companies c
               ON c.id = j.company_id
             WHERE ${whereClause}
             ORDER BY j.created_at DESC
             LIMIT $${limitParam}
             OFFSET $${offsetParam}`,
            values
        );

        return res.status(200).json({
            success: true,
            data: {
                jobs: result.rows,
                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total,
                    totalPages:
                        Math.ceil(
                            total / limitNumber
                        ),
                },
            },
        });
    } catch (error) {
        console.error("Get jobs error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getJobById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isPositiveInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID",
            });
        }

        const result = await pool.query(
            `SELECT
                j.id,
                j.title,
                j.description,
                j.employment_type,
                j.experience_level,
                j.location,
                j.is_remote,
                j.salary_min,
                j.salary_max,
                j.status,
                j.application_deadline,
                j.created_at,
                j.updated_at,
                c.id AS company_id,
                c.name AS company_name,
                c.description AS company_description,
                c.website_url AS company_website,
                c.logo_url AS company_logo,
                c.location AS company_location,
                c.industry AS company_industry
             FROM jobs j
             JOIN companies c
               ON c.id = j.company_id
             WHERE j.id = $1
               AND j.status = 'open'`,
            [Number(id)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                job: result.rows[0],
            },
        });
    } catch (error) {
        console.error(
            "Get job by ID error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getMyJobs = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                j.id,
                j.title,
                j.description,
                j.employment_type,
                j.experience_level,
                j.location,
                j.is_remote,
                j.salary_min,
                j.salary_max,
                j.status,
                j.application_deadline,
                j.created_at,
                c.id AS company_id,
                c.name AS company_name,
                COUNT(a.id)::int AS application_count
            FROM jobs j
            JOIN companies c
                ON c.id = j.company_id
            LEFT JOIN applications a
                ON a.job_id = j.id
            WHERE j.posted_by = $1
            GROUP BY
                j.id,
                c.id
            ORDER BY j.created_at DESC
            `,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            data: {
                jobs: result.rows,
            },
        });
    } catch (error) {
        console.error(
            "Get my jobs error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    createJob,
    getJobs,
    getJobById,
    getMyJobs,
};