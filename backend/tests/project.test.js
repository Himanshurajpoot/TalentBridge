const jwt = require("jsonwebtoken");
const request = require("supertest");

const app = require("../src/app");
const pool = require("../src/config/db");

describe("Projects API", () => {
    let clientToken;
    let freelancerToken;
    let secondFreelancerToken;
    let adminToken;
    let companyId;
    let projectId;
    let visibilityProjectId;
    let visibilityProposalId;
    const portfolioProjectIds = [];

    beforeAll(async () => {
        const clientLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "client.test@example.com",
                password: "ClientPassword123",
            });

        expect(clientLogin.statusCode).toBe(200);

        clientToken =
            clientLogin.body.data.token;

        const freelancerLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "himanshu.test@example.com",
                password: "TestPassword123",
            });

        expect(freelancerLogin.statusCode).toBe(200);

        freelancerToken =
            freelancerLogin.body.data.token;

        const secondFreelancerLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "freelancer2.test@example.com",
                password: "TestPassword456",
            });

        expect(secondFreelancerLogin.statusCode).toBe(200);
        secondFreelancerToken =
            secondFreelancerLogin.body.data.token;
        adminToken = jwt.sign(
            {
                userId: secondFreelancerLogin.body.data.user.id,
                role: "admin",
            },
            process.env.JWT_SECRET
        );

        const companyResponse = await request(app)
            .post("/api/companies")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                name: "TalentBridge Project Test Company",
                description:
                    "Company created for project API tests.",
                location: "Noida",
                industry: "Technology",
            });

        expect(companyResponse.statusCode).toBe(201);

        companyId =
            companyResponse.body.data.company.id;

        expect(companyId).toEqual(
            expect.any(String)
        );
    });

    afterAll(async () => {
        if (visibilityProposalId) {
            await pool.query(
                "DELETE FROM proposals WHERE id = $1",
                [visibilityProposalId]
            );
        }

        if (visibilityProjectId) {
            await pool.query(
                "DELETE FROM projects WHERE id = $1",
                [visibilityProjectId]
            );
        }

        if (portfolioProjectIds.length > 0) {
            await pool.query(
                "DELETE FROM proposals WHERE project_id = ANY($1::bigint[])",
                [portfolioProjectIds]
            );

            await pool.query(
                "DELETE FROM projects WHERE id = ANY($1::bigint[])",
                [portfolioProjectIds]
            );
        }

        if (projectId) {
            await pool.query(
                "DELETE FROM projects WHERE id = $1",
                [projectId]
            );
        }

        if (companyId) {
            await pool.query(
                "DELETE FROM companies WHERE id = $1",
                [companyId]
            );
        }
    });

    test("GET /api/projects should return open projects", async () => {
        const response = await request(app)
            .get("/api/projects");

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(response.body.data.projects)
        ).toBe(true);

        expect(
            response.body.data.pagination
        ).toMatchObject({
            page: 1,
            limit: 10,
        });
    });

    test("POST /api/projects should reject request without token", async () => {
        const response = await request(app)
            .post("/api/projects")
            .send({
                title: "Test Project",
                description: "Test project description",
            });

        expect(response.statusCode).toBe(401);

        expect(response.body.success).toBe(false);
    });

    test("POST /api/projects should reject freelancer", async () => {
        const response = await request(app)
            .post("/api/projects")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                title: "Test Project",
                description: "Test project description",
            });

        expect(response.statusCode).toBe(403);

        expect(response.body.success).toBe(false);
    });

    test("POST /api/projects should reject missing title and description", async () => {
        const response = await request(app)
            .post("/api/projects")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({});

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "Title and description are required",
        });
    });

    test("POST /api/projects should reject invalid budget range", async () => {
        const response = await request(app)
            .post("/api/projects")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                title: "Budget Test Project",
                description:
                    "Testing invalid project budget.",
                budgetMin: 100000,
                budgetMax: 50000,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "Minimum budget cannot be greater than maximum budget",
        });
    });

    test("POST /api/projects should reject company not owned by client", async () => {
        const response = await request(app)
            .post("/api/projects")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId: 999999,
                title: "Company Test Project",
                description:
                    "Testing company ownership.",
            });

        expect(response.statusCode).toBe(403);

        expect(response.body).toEqual({
            success: false,
            message: "You do not own this company",
        });
    });

    test("POST /api/projects should create a valid project", async () => {
        const response = await request(app)
            .post("/api/projects")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId: companyId,
                title: "Automated Project Test",
                description:
                    "Temporary project created by automated tests.",
                budgetMin: 50000,
                budgetMax: 90000,
                experienceLevel: "mid",
                deadline:
                    "2027-12-31T23:59:59.000Z",
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Project created successfully"
        );

        expect(response.body.data.project).toMatchObject({
            title: "Automated Project Test",
            description:
                "Temporary project created by automated tests.",
            client_id: 3,
            company_id: companyId,
            budget_min: "50000.00",
            budget_max: "90000.00",
            experience_level: "mid",
            status: "open",
        });

        projectId =
            response.body.data.project.id;

        expect(projectId).toEqual(
            expect.any(String)
        );
    });

    test("GET /api/projects/my should return client's projects", async () => {
        const response = await request(app)
            .get("/api/projects/my")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(response.body.data.projects)
        ).toBe(true);

        const project =
            response.body.data.projects.find(
                (item) =>
                    item.id === projectId
            );

        expect(project).toBeDefined();

        expect(project).toMatchObject({
            id: projectId,
            client_id: 3,
            title: "Automated Project Test",
        });
    });

    test("GET /api/projects/:id should return project details", async () => {
        const response = await request(app)
            .get(`/api/projects/${projectId}`)
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            response.body.data.project
        ).toMatchObject({
            id: projectId,
            client_id: 3,
            title: "Automated Project Test",
            description:
                "Temporary project created by automated tests.",
            status: "open",
        });

        expect(
            Array.isArray(
                response.body.data.project.skills
            )
        ).toBe(true);
    });

    test("GET /api/projects/:id should allow freelancer to view an open project", async () => {
        const response = await request(app)
            .get(`/api/projects/${projectId}`)
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);
    });

    test("GET project skills keeps open projects public", async () => {
        const response = await request(app)
            .get(
                `/api/projects/${projectId}/skills`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(response.body.data.skills)
        ).toBe(true);
    });

    describe("GET project skills visibility for non-open projects", () => {
        beforeAll(async () => {
            const projectResponse = await request(app)
                .post("/api/projects")
                .set("Authorization", ["Bearer", clientToken].join(" "))
                .send({
                    companyId,
                    title: "Restricted Skills Visibility Project",
                    description: "Project used to verify skills visibility.",
                });

            expect(projectResponse.statusCode).toBe(201);
            visibilityProjectId =
                projectResponse.body.data.project.id;

            const proposalResponse = await request(app)
                .post(
                    `/api/projects/${visibilityProjectId}/proposals`
                )
                .set(
                    "Authorization",
                    ["Bearer", freelancerToken].join(" ")
                )
                .send({
                    coverLetter: "Proposal for restricted skills test.",
                    proposedBudget: 70000,
                    estimatedDays: 30,
                });

            expect(proposalResponse.statusCode).toBe(201);
            visibilityProposalId =
                proposalResponse.body.data.proposal.id;

            await pool.query(
                `UPDATE proposals
                 SET status = 'accepted'
                 WHERE id = $1`,
                [visibilityProposalId]
            );
            await pool.query(
                `UPDATE projects
                 SET status = 'in_progress'
                 WHERE id = $1`,
                [visibilityProjectId]
            );
        });

        test("denies unauthenticated access", async () => {
            const response = await request(app)
                .get(`/api/projects/${visibilityProjectId}/skills`);

            expect(response.statusCode).toBe(401);
            expect(response.body).toEqual({
                success: false,
                message: "Authentication required",
            });
        });

        test("denies an unrelated authenticated user", async () => {
            const response = await request(app)
                .get(`/api/projects/${visibilityProjectId}/skills`)
                .set(
                    "Authorization",
                    ["Bearer", secondFreelancerToken].join(" ")
                );

            expect(response.statusCode).toBe(403);
            expect(response.body).toEqual({
                success: false,
                message: "You do not have access to this project",
            });
        });

        test("allows the project owner", async () => {
            const response = await request(app)
                .get(`/api/projects/${visibilityProjectId}/skills`)
                .set("Authorization", ["Bearer", clientToken].join(" "));

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.skills)).toBe(true);
        });

        test("allows the accepted freelancer", async () => {
            const response = await request(app)
                .get(`/api/projects/${visibilityProjectId}/skills`)
                .set("Authorization", ["Bearer", freelancerToken].join(" "));

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.skills)).toBe(true);
        });

        test("allows an admin", async () => {
            const response = await request(app)
                .get(`/api/projects/${visibilityProjectId}/skills`)
                .set("Authorization", ["Bearer", adminToken].join(" "));

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.skills)).toBe(true);
        });
    });

    test("POST /api/projects/:projectId/skills should reject missing skill ID", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/skills`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({});

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Skill ID is required",
        });
    });

    test("PATCH /api/projects/:projectId/complete should reject project that is not in progress", async () => {
        const response = await request(app)
            .patch(
                `/api/projects/${projectId}/complete`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "Only in-progress projects can be completed",
        });
    });

    test("GET /api/projects/user/:userId/portfolio should require authentication", async () => {
        const response = await request(app)
            .get("/api/projects/user/2/portfolio");

        expect(response.statusCode).toBe(401);

        expect(response.body).toEqual({
            success: false,
            message: "Authentication required",
        });
    });

    test("GET /api/projects/user/:userId/portfolio should return accepted in-progress and completed projects", async () => {
        const fixtures = [
            {
                title: "Portfolio In Progress Project",
                status: "in_progress",
                proposalStatus: "accepted",
            },
            {
                title: "Portfolio Completed Project",
                status: "completed",
                proposalStatus: "accepted",
            },
            {
                title: "Portfolio Pending Proposal Project",
                status: "in_progress",
                proposalStatus: "pending",
            },
            {
                title: "Portfolio Open Project",
                status: "open",
                proposalStatus: "accepted",
            },
        ];
        const proposalIds = [];

        for (const fixture of fixtures) {
            const projectResponse = await request(app)
                .post("/api/projects")
                .set(
                    "Authorization",
                    `Bearer ${clientToken}`
                )
                .send({
                    companyId,
                    title: fixture.title,
                    description: "Portfolio API test fixture.",
                    budgetMin: 50000,
                    budgetMax: 90000,
                });

            expect(projectResponse.statusCode).toBe(201);

            const createdProject =
                projectResponse.body.data.project;

            portfolioProjectIds.push(createdProject.id);

            const proposalResponse = await request(app)
                .post(
                    `/api/projects/${createdProject.id}/proposals`
                )
                .set(
                    "Authorization",
                    `Bearer ${freelancerToken}`
                )
                .send({
                    coverLetter: "Portfolio API test proposal.",
                    proposedBudget: 70000,
                    estimatedDays: 30,
                });

            expect(proposalResponse.statusCode).toBe(201);

            proposalIds.push(
                proposalResponse.body.data.proposal.id
            );
        }

        await pool.query(
            `UPDATE projects
             SET status = CASE id
                 WHEN $1 THEN 'in_progress'
                 WHEN $2 THEN 'completed'
                 WHEN $3 THEN 'in_progress'
                 WHEN $4 THEN 'open'
             END
             WHERE id = ANY($5::bigint[])`,
            [...portfolioProjectIds, portfolioProjectIds]
        );

        await pool.query(
            `UPDATE proposals
             SET status = CASE id
                 WHEN $1 THEN 'accepted'
                 WHEN $2 THEN 'accepted'
                 WHEN $3 THEN 'pending'
                 WHEN $4 THEN 'accepted'
             END
             WHERE id = ANY($5::bigint[])`,
            [...proposalIds, proposalIds]
        );

        const response = await request(app)
            .get("/api/projects/user/2/portfolio")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(
            Array.isArray(response.body.data.projects)
        ).toBe(true);

        const fixtureProjects =
            response.body.data.projects.filter(
                (project) =>
                    portfolioProjectIds.includes(project.id)
            );

        expect(
            fixtureProjects.map(
                (project) => project.id
            ).sort()
        ).toEqual(
            portfolioProjectIds.slice(0, 2).sort()
        );

        const inProgressProject =
            fixtureProjects.find(
                (project) =>
                    project.id === portfolioProjectIds[0]
            );
        const completedProject =
            fixtureProjects.find(
                (project) =>
                    project.id === portfolioProjectIds[1]
            );

        expect(inProgressProject).toMatchObject({
            budget_min: "50000.00",
            budget_max: "90000.00",
            status: "in_progress",
        });
        expect(completedProject).toMatchObject({
            budget_min: "50000.00",
            budget_max: "90000.00",
            status: "completed",
        });

        const acceptedFreelancerResponse = await request(app)
            .get("/api/projects/user/2/portfolio")
            .set(
                "Authorization",
                ["Bearer", freelancerToken].join(" ")
            );
        expect(acceptedFreelancerResponse.statusCode).toBe(200);
        expect(
            acceptedFreelancerResponse.body.data.projects
                .filter((project) =>
                    portfolioProjectIds.includes(project.id)
                )
                .map((project) => project.id)
                .sort()
        ).toEqual(portfolioProjectIds.slice(0, 2).sort());

        const unrelatedFreelancerResponse = await request(app)
            .get("/api/projects/user/2/portfolio")
            .set(
                "Authorization",
                ["Bearer", secondFreelancerToken].join(" ")
            );
        expect(unrelatedFreelancerResponse.statusCode).toBe(200);
        expect(
            unrelatedFreelancerResponse.body.data.projects.some(
                (project) =>
                    portfolioProjectIds.includes(project.id)
            )
        ).toBe(false);

        const adminResponse = await request(app)
            .get("/api/projects/user/2/portfolio")
            .set(
                "Authorization",
                ["Bearer", adminToken].join(" ")
            );
        expect(adminResponse.statusCode).toBe(200);
        expect(
            adminResponse.body.data.projects
                .filter((project) =>
                    portfolioProjectIds.includes(project.id)
                )
                .map((project) => project.id)
                .sort()
        ).toEqual(portfolioProjectIds.slice(0, 2).sort());
    });

    test("GET /api/projects/user/:userId/portfolio returns an empty list when none are visible", async () => {
        const response = await request(app)
            .get("/api/projects/user/999999999/portfolio")
            .set(
                "Authorization",
                ["Bearer", freelancerToken].join(" ")
            );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            success: true,
            data: {
                projects: [],
            },
        });
    });
});