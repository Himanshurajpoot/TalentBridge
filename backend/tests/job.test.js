const request = require("supertest");

const app = require("../src/app");
const pool = require("../src/config/db");

describe("Jobs API", () => {
    let clientToken;
    let companyId;
    let createdJobId;
    let skillId;
    let skillName;
    let skillJobSequence = 0;
    const createdSkillJobIds = [];

    beforeAll(async () => {
        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: "client.test@example.com",
                password: "ClientPassword123",
            });

        expect(loginResponse.statusCode).toBe(200);

        clientToken =
            loginResponse.body.data.token;

        const companyResponse = await request(app)
            .post("/api/companies")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                name: "TalentBridge Job Test Company",
                description:
                    "Company created for job API tests.",
                location: "Noida",
                industry: "Technology",
            });

        expect(companyResponse.statusCode).toBe(201);

        companyId =
            companyResponse.body.data.company.id;

        expect(companyId).toEqual(
            expect.any(String)
        );

        skillName =
            `TalentBridge Job Test Skill ${Date.now()}`;

        const skillResult = await pool.query(
            `INSERT INTO skills (name)
             VALUES ($1)
             RETURNING id`,
            [skillName]
        );

        skillId = Number(skillResult.rows[0].id);
    });

    afterAll(async () => {
        if (createdSkillJobIds.length > 0) {
            await pool.query(
                "DELETE FROM job_skills WHERE job_id = ANY($1::bigint[])",
                [createdSkillJobIds]
            );

            await pool.query(
                "DELETE FROM jobs WHERE id = ANY($1::bigint[])",
                [createdSkillJobIds]
            );
        }

        if (createdJobId) {
            await pool.query(
                "DELETE FROM jobs WHERE id = $1",
                [createdJobId]
            );
        }

        if (companyId) {
            await pool.query(
                "DELETE FROM companies WHERE id = $1",
                [companyId]
            );
        }

        if (skillId) {
            await pool.query(
                "DELETE FROM skills WHERE id = $1",
                [skillId]
            );
        }
    });

    const createSkillTestJob = async (skillIds, title) => {
        skillJobSequence += 1;
        const jobTitle =
            title ||
            `TalentBridge Skill Test Job ${Date.now()}-${skillJobSequence}`;

        const response = await request(app)
            .post("/api/jobs")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId,
                title: jobTitle,
                description: "Job skills feature test job.",
                employmentType: "full_time",
                skillIds,
            });

        if (response.statusCode === 201) {
            createdSkillJobIds.push(
                response.body.data.job.id
            );
        }

        return {
            response,
            title: jobTitle,
        };
    };

    test("GET /api/jobs should return open jobs", async () => {
        const response = await request(app)
            .get("/api/jobs");

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(response.body.data.jobs)
        ).toBe(true);

        expect(
            response.body.data.pagination
        ).toMatchObject({
            page: 1,
            limit: 10,
        });
    });

    test("GET /api/jobs should reject invalid page", async () => {
        const response = await request(app)
            .get("/api/jobs?page=0");

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "page must be a positive integer",
        });
    });

    test("GET /api/jobs should reject invalid limit", async () => {
        const response = await request(app)
            .get("/api/jobs?limit=100");

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "limit must be between 1 and 50",
        });
    });

    test("GET /api/jobs should reject invalid employment type", async () => {
        const response = await request(app)
            .get(
                "/api/jobs?employmentType=invalid_type"
            );

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid employment type",
        });
    });

    test("GET /api/jobs should reject invalid salary range", async () => {
        const response = await request(app)
            .get(
                "/api/jobs?minSalary=100000&maxSalary=50000"
            );

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "minSalary cannot be greater than maxSalary",
        });
    });

    test("GET /api/jobs/:id should reject invalid job ID", async () => {
        const response = await request(app)
            .get("/api/jobs/invalid");

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid job ID",
        });
    });

    test("POST /api/jobs should reject request without token", async () => {
        const response = await request(app)
            .post("/api/jobs")
            .send({
                companyId: companyId,
                title: "Test Job",
                description: "Test job description",
                employmentType: "full_time",
            });

        expect(response.statusCode).toBe(401);

        expect(response.body.success).toBe(false);
    });

    test("POST /api/jobs should reject missing required fields", async () => {
        const response = await request(app)
            .post("/api/jobs")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId: companyId,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "companyId, title, description and employmentType are required",
        });
    });

    test("POST /api/jobs should reject invalid employment type", async () => {
        const response = await request(app)
            .post("/api/jobs")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId: companyId,
                title: "Test Job",
                description: "Test job description",
                employmentType: "invalid_type",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid employment type",
        });
    });

    test("POST /api/jobs should reject invalid salary range", async () => {
        const response = await request(app)
            .post("/api/jobs")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId: companyId,
                title: "Test Job",
                description: "Test job description",
                employmentType: "full_time",
                salaryMin: 100000,
                salaryMax: 50000,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "salaryMin cannot be greater than salaryMax",
        });
    });

    test("POST /api/jobs should create a valid job", async () => {
        const response = await request(app)
            .post("/api/jobs")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId: companyId,
                title: "Automated Test Job",
                description:
                    "This job was created by the automated test suite.",
                employmentType: "full_time",
                experienceLevel: "mid",
                location: "Noida",
                isRemote: true,
                salaryMin: 50000,
                salaryMax: 80000,
                applicationDeadline:
                    "2027-12-31T23:59:59.000Z",
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Job created successfully"
        );

        expect(response.body.data.job).toMatchObject({
            title: "Automated Test Job",
            description:
                "This job was created by the automated test suite.",
            employment_type: "full_time",
            experience_level: "mid",
            location: "Noida",
            is_remote: true,
        });

        createdJobId =
            response.body.data.job.id;

        expect(createdJobId).toEqual(
            expect.any(String)
        );

        expect(Number(createdJobId)).toBeGreaterThan(0);
    });

    test("POST /api/jobs should store valid skill IDs", async () => {
        const { response } = await createSkillTestJob(
            [skillId]
        );

        expect(response.statusCode).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.skillIds).toEqual([
            skillId,
        ]);

        const skillResult = await pool.query(
            `SELECT skill_id
             FROM job_skills
             WHERE job_id = $1`,
            [response.body.data.job.id]
        );

        expect(
            skillResult.rows.map((row) =>
                Number(row.skill_id)
            )
        ).toEqual([skillId]);
    });

    test.each([
        ["boolean true", true],
        ["boolean false", false],
        ["null", null],
        ["string", "1"],
        ["decimal", 1.5],
        ["zero", 0],
        ["negative", -1],
    ])("POST /api/jobs should reject %s as a skill ID", async (_, invalidId) => {
        const { response } = await createSkillTestJob([
            invalidId,
        ]);

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({
            success: false,
            message:
                "skillIds must contain only positive integers",
        });
    });

    test("POST /api/jobs should reject skillIds when it is not an array", async () => {
        const response = await request(app)
            .post("/api/jobs")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId,
                title: `TalentBridge Skill Test Job ${Date.now()}`,
                description: "Job skills feature test job.",
                employmentType: "full_time",
                skillIds: skillId,
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({
            success: false,
            message: "skillIds must be an array",
        });
    });

    test("POST /api/jobs should reject duplicate skill IDs", async () => {
        const { response } = await createSkillTestJob([
            skillId,
            skillId,
        ]);

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({
            success: false,
            message: "skillIds must not contain duplicates",
        });
    });

    test("POST /api/jobs should reject a nonexistent skill ID without creating a job", async () => {
        const title =
            `TalentBridge Invalid Skill Job ${Date.now()}`;
        const { response } = await createSkillTestJob(
            [Number.MAX_SAFE_INTEGER],
            title
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({
            success: false,
            message: "One or more skill IDs are invalid",
        });

        const jobResult = await pool.query(
            "SELECT id FROM jobs WHERE title = $1",
            [title]
        );

        expect(jobResult.rows).toHaveLength(0);
    });

    test("GET /api/jobs should filter by skill and exclude jobs without that skill", async () => {
        const withSkill = await createSkillTestJob([
            skillId,
        ]);
        const withoutSkill = await createSkillTestJob([]);

        expect(withSkill.response.statusCode).toBe(201);
        expect(withoutSkill.response.statusCode).toBe(201);

        const response = await request(app)
            .get("/api/jobs")
            .query({ skill: skillName });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        const returnedJobIds =
            response.body.data.jobs.map((job) => job.id);

        expect(returnedJobIds).toContain(
            withSkill.response.body.data.job.id
        );
        expect(returnedJobIds).not.toContain(
            withoutSkill.response.body.data.job.id
        );
    });
});