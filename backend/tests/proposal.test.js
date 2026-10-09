const request = require("supertest");

const app = require("../src/app");
const pool = require("../src/config/db");

describe("Proposals API", () => {
    let clientToken;
    let freelancerToken;
    let secondFreelancerToken;
    let companyId;
    let projectId;
    let secondProjectId;
    let proposalId;
    let secondProposalId;
    let thirdProposalId;
    let contractId;

    const authorizationHeader = (token) =>
        ["Bearer", token].join(" ");

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

        const companyResponse = await request(app)
            .post("/api/companies")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                name: "TalentBridge Proposal Test Company",
                description:
                    "Company created for proposal API tests.",
                location: "Noida",
                industry: "Technology",
            });

        expect(companyResponse.statusCode).toBe(201);

        companyId =
            companyResponse.body.data.company.id;

        expect(companyId).toEqual(
            expect.any(String)
        );

        const projectResponse = await request(app)
            .post("/api/projects")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId: companyId,
                title: "Automated Proposal Test Project",
                description:
                    "Temporary project for proposal API testing.",
                budgetMin: 50000,
                budgetMax: 90000,
                experienceLevel: "mid",
                deadline:
                    "2027-12-31T23:59:59.000Z",
            });

        expect(projectResponse.statusCode).toBe(201);

        projectId =
            projectResponse.body.data.project.id;

        expect(projectId).toEqual(
            expect.any(String)
        );

        const secondProjectResponse = await request(app)
            .post("/api/projects")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId: companyId,
                title: "Second Automated Proposal Project",
                description:
                    "Temporary project for rejection testing.",
                budgetMin: 40000,
                budgetMax: 80000,
                experienceLevel: "mid",
                deadline:
                    "2027-12-31T23:59:59.000Z",
            });

        expect(
            secondProjectResponse.statusCode
        ).toBe(201);

        secondProjectId =
            secondProjectResponse.body.data.project.id;

        expect(secondProjectId).toEqual(
            expect.any(String)
        );
    });

    afterAll(async () => {
        if (proposalId) {
            await pool.query(
                "DELETE FROM contracts WHERE proposal_id = $1",
                [proposalId]
            );
        }

        if (proposalId) {
            await pool.query(
                "DELETE FROM proposals WHERE id = $1",
                [proposalId]
            );
        }

        if (secondProposalId) {
            await pool.query(
                "DELETE FROM proposals WHERE id = $1",
                [secondProposalId]
            );
        }

        if (thirdProposalId) {
            await pool.query(
                "DELETE FROM proposals WHERE id = $1",
                [thirdProposalId]
            );
        }

        if (projectId) {
            await pool.query(
                "DELETE FROM projects WHERE id = $1",
                [projectId]
            );
        }

        if (secondProjectId) {
            await pool.query(
                "DELETE FROM projects WHERE id = $1",
                [secondProjectId]
            );
        }

        if (companyId) {
            await pool.query(
                "DELETE FROM companies WHERE id = $1",
                [companyId]
            );
        }
    });

    const verifyStatusTransition = async (
        initialStatus,
        requestedStatus,
        expectedStatusCode
    ) => {
        let isolatedProjectId;
        let isolatedProposalId;

        try {
            const projectResponse = await request(app)
                .post("/api/projects")
                .set(
                    "Authorization",
                    `Bearer ${clientToken}`
                )
                .send({
                    companyId,
                    title: "Isolated Proposal Transition Project",
                    description:
                        "Temporary project for proposal transition testing.",
                    budgetMin: 50000,
                    budgetMax: 90000,
                    experienceLevel: "mid",
                    deadline: "2027-12-31T23:59:59.000Z",
                });

            expect(projectResponse.statusCode).toBe(201);
            isolatedProjectId =
                projectResponse.body.data.project.id;

            const proposalResponse = await request(app)
                .post(
                    `/api/projects/${isolatedProjectId}/proposals`
                )
                .set(
                    "Authorization",
                    `Bearer ${freelancerToken}`
                )
                .send({
                    coverLetter: "Testing a proposal status transition.",
                    proposedBudget: 60000,
                    estimatedDays: 15,
                });

            expect(proposalResponse.statusCode).toBe(201);
            isolatedProposalId =
                proposalResponse.body.data.proposal.id;

            await pool.query(
                "UPDATE proposals SET status = $1 WHERE id = $2",
                [initialStatus, isolatedProposalId]
            );

            const response = await request(app)
                .patch(
                    `/api/projects/${isolatedProjectId}/proposals/${isolatedProposalId}/status`
                )
                .set(
                    "Authorization",
                    `Bearer ${clientToken}`
                )
                .send({ status: requestedStatus });

            expect(response.statusCode).toBe(expectedStatusCode);

            if (expectedStatusCode === 409) {
                expect(response.body).toEqual({
                    success: false,
                    message: "Invalid proposal status transition",
                });
            } else {
                expect(response.body).toMatchObject({
                    success: true,
                    data: {
                        proposal: {
                            id: isolatedProposalId,
                            status: requestedStatus,
                        },
                    },
                });
            }
        } finally {
            if (isolatedProposalId) {
                await pool.query(
                    "DELETE FROM proposals WHERE id = $1",
                    [isolatedProposalId]
                );
            }

            if (isolatedProjectId) {
                await pool.query(
                    "DELETE FROM projects WHERE id = $1",
                    [isolatedProjectId]
                );
            }
        }
    };

    test("PATCH proposal status should allow pending to shortlisted", async () => {
        await verifyStatusTransition(
            "pending",
            "shortlisted",
            200
        );
    });

    test("PATCH proposal status should reject shortlisted to pending", async () => {
        await verifyStatusTransition(
            "shortlisted",
            "pending",
            409
        );
    });

    test("PATCH proposal status should reject rejected to accepted", async () => {
        await verifyStatusTransition(
            "rejected",
            "accepted",
            409
        );
    });

    test("PATCH proposal status should reject accepted to rejected", async () => {
        await verifyStatusTransition(
            "accepted",
            "rejected",
            409
        );
    });

    test("PATCH proposal status should reject withdrawn to shortlisted", async () => {
        await verifyStatusTransition(
            "withdrawn",
            "shortlisted",
            409
        );
    });

    test("POST proposal should reject request without token", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/proposals`
            )
            .send({
                coverLetter:
                    "I am interested in this project.",
                proposedBudget: 60000,
                estimatedDays: 15,
            });

        expect(response.statusCode).toBe(401);

        expect(response.body).toEqual({
            success: false,
            message: "Authentication required",
        });
    });

    test("POST proposal should reject client", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                coverLetter:
                    "I am interested in this project.",
                proposedBudget: 60000,
                estimatedDays: 15,
            });

        expect(response.statusCode).toBe(403);

        expect(response.body.success).toBe(false);
    });

    test("POST proposal should reject missing cover letter", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                proposedBudget: 60000,
                estimatedDays: 15,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Cover letter is required",
        });
    });

    test("POST proposal should reject invalid proposed budget", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "I am interested in this project.",
                proposedBudget: -5000,
                estimatedDays: 15,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "Valid proposed budget is required",
        });
    });

    test("POST proposal should reject invalid estimated days", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "I am interested in this project.",
                proposedBudget: 60000,
                estimatedDays: 0,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "Estimated days must be greater than 0",
        });
    });

    test("POST proposal should reject non-existent project", async () => {
        const response = await request(app)
            .post(
                "/api/projects/999999999/proposals"
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "I am interested in this project.",
                proposedBudget: 60000,
                estimatedDays: 15,
            });

        expect(response.statusCode).toBe(404);

        expect(response.body).toEqual({
            success: false,
            message: "Open project not found",
        });
    });

    test("POST proposal should create a proposal", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "I am interested in this project and have experience with React, Node.js, Express.js, and PostgreSQL.",
                proposedBudget: 60000,
                estimatedDays: 15,
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Proposal submitted successfully"
        );

        expect(
            response.body.data.proposal
        ).toMatchObject({
            project_id: projectId,
            freelancer_id: 2,
            cover_letter:
                "I am interested in this project and have experience with React, Node.js, Express.js, and PostgreSQL.",
            proposed_budget: "60000.00",
            estimated_days: 15,
            status: "pending",
        });

        proposalId =
            response.body.data.proposal.id;

        expect(proposalId).toEqual(
            expect.any(String)
        );
    });

    test("POST proposal should reject duplicate proposal", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "Another proposal attempt.",
                proposedBudget: 65000,
                estimatedDays: 20,
            });

        expect(response.statusCode).toBe(409);

        expect(response.body).toEqual({
            success: false,
            message:
                "You have already submitted a proposal for this project",
        });
    });

    test("POST second freelancer proposal should create another proposal", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${secondFreelancerToken}`
            )
            .send({
                coverLetter:
                    "I would also like to work on this project.",
                proposedBudget: 55000,
                estimatedDays: 14,
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(
            response.body.data.proposal
        ).toMatchObject({
            project_id: projectId,
            freelancer_id: 4,
            proposed_budget: "55000.00",
            estimated_days: 14,
            status: "pending",
        });

        thirdProposalId =
            response.body.data.proposal.id;

        expect(thirdProposalId).toEqual(
            expect.any(String)
        );
    });

    test("GET /api/proposals/me should return freelancer proposals", async () => {
        const response = await request(app)
            .get("/api/proposals/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(
                response.body.data.proposals
            )
        ).toBe(true);

        const proposal =
            response.body.data.proposals.find(
                (item) =>
                    item.id === proposalId
            );

        expect(proposal).toBeDefined();

        expect(proposal).toMatchObject({
            id: proposalId,
            project_id: projectId,
            freelancer_id: 2,
            project_title:
                "Automated Proposal Test Project",
            status: "pending",
        });
    });

    test("GET project proposals should allow project owner", async () => {
        const response = await request(app)
            .get(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(
                response.body.data.proposals
            )
        ).toBe(true);

        const proposal =
            response.body.data.proposals.find(
                (item) =>
                    item.id === proposalId
            );

        expect(proposal).toBeDefined();

        expect(proposal).toMatchObject({
            id: proposalId,
            project_id: projectId,
            freelancer_id: 2,
            freelancer_name: "Himanshu Test",
            freelancer_email:
                "himanshu.test@example.com",
            status: "pending",
        });
    });

    test("GET project proposals should reject freelancer", async () => {
        const response = await request(app)
            .get(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(403);

        expect(response.body.success).toBe(false);
    });

    test("PATCH proposal status should reject invalid status", async () => {
        const response = await request(app)
            .patch(
                `/api/projects/${projectId}/proposals/${proposalId}/status`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                status: "invalid_status",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid proposal status",
        });
    });

    test("PATCH proposal status should reject unauthorized freelancer", async () => {
        const response = await request(app)
            .patch(
                `/api/projects/${projectId}/proposals/${proposalId}/status`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                status: "accepted",
            });

        expect(response.statusCode).toBe(403);

        expect(response.body.success).toBe(false);
    });

    test("PATCH proposal status should accept proposal and move project to in_progress", async () => {
        const response = await request(app)
            .patch(
                `/api/projects/${projectId}/proposals/${proposalId}/status`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                status: "accepted",
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Proposal accepted and project moved to in progress"
        );

        expect(
            response.body.data.proposal
        ).toMatchObject({
            id: proposalId,
            project_id: projectId,
            freelancer_id: 2,
            status: "accepted",
        });

        expect(
            response.body.data.project
        ).toMatchObject({
            id: projectId,
            status: "in_progress",
        });

        const contractResult = await pool.query(
            `SELECT
                id,
                proposal_id,
                project_id,
                client_id,
                freelancer_id,
                agreed_amount,
                status
             FROM contracts
             WHERE proposal_id = $1`,
            [proposalId]
        );

        expect(contractResult.rowCount).toBe(1);
        contractId = contractResult.rows[0].id;
        expect(contractResult.rows[0]).toMatchObject({
            proposal_id: proposalId,
            project_id: projectId,
            client_id: expect.any(Number),
            freelancer_id: 2,
            agreed_amount: "60000.00",
            status: "active",
        });

        const projectResult = await pool.query(
            "SELECT client_id FROM projects WHERE id = $1",
            [projectId]
        );
        expect(contractResult.rows[0].client_id).toBe(
            projectResult.rows[0].client_id
        );
    });

    test("GET /api/contracts/me should return contracts for either participant", async () => {
        const clientResponse = await request(app)
            .get("/api/contracts/me")
            .set("Authorization", authorizationHeader(clientToken));

        expect(clientResponse.statusCode).toBe(200);
        expect(clientResponse.body.data.contracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contractId,
                    project: expect.objectContaining({
                        id: projectId,
                        title: "Automated Proposal Test Project",
                    }),
                }),
            ])
        );

        const freelancerResponse = await request(app)
            .get("/api/contracts/me")
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            );

        expect(freelancerResponse.statusCode).toBe(200);
        expect(freelancerResponse.body.data.contracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contractId,
                    freelancer: expect.objectContaining({
                        id: 2,
                        name: "Himanshu Test",
                    }),
                }),
            ])
        );
    });

    test("GET /api/contracts/:contractId should restrict access to contract participants", async () => {
        const clientResponse = await request(app)
            .get(`/api/contracts/${contractId}`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(clientResponse.statusCode).toBe(200);
        expect(clientResponse.body.data.contract).toMatchObject({
            id: contractId,
            agreed_amount: "60000.00",
            project: {
                id: projectId,
                title: "Automated Proposal Test Project",
            },
            client: {
                id: expect.any(Number),
                name: expect.any(String),
            },
            freelancer: {
                id: 2,
                name: "Himanshu Test",
            },
        });

        const freelancerResponse = await request(app)
            .get(`/api/contracts/${contractId}`)
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            );

        expect(freelancerResponse.statusCode).toBe(200);

        const unauthorizedResponse = await request(app)
            .get(`/api/contracts/${contractId}`)
            .set(
                "Authorization",
                authorizationHeader(secondFreelancerToken)
            );

        expect(unauthorizedResponse.statusCode).toBe(403);
    });

    test("GET /api/contracts/:contractId should return 404 for a missing contract", async () => {
        const response = await request(app)
            .get("/api/contracts/9223372036854775807")
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({
            success: false,
            message: "Contract not found",
        });
    });

    test("repeated proposal acceptance should not create a duplicate contract", async () => {
        const response = await request(app)
            .patch(
                `/api/projects/${projectId}/proposals/${proposalId}/status`
            )
            .set("Authorization", authorizationHeader(clientToken))
            .send({
                status: "accepted",
            });

        expect(response.statusCode).toBe(409);
        expect(response.body).toEqual({
            success: false,
            message: "Invalid proposal status transition",
        });

        const contractResult = await pool.query(
            "SELECT COUNT(*) FROM contracts WHERE proposal_id = $1",
            [proposalId]
        );
        expect(Number(contractResult.rows[0].count)).toBe(1);
    });

    test("contract creation failure should roll back proposal acceptance and project update", async () => {
        let isolatedProjectId;
        let isolatedProposalId;
        let seededContractId;

        try {
            const isolatedProjectResponse = await request(app)
                .post("/api/projects")
                .set(
                    "Authorization",
                    authorizationHeader(clientToken)
                )
                .send({
                    companyId,
                    title: "Contract Rollback Test Project",
                    description: "Initial contract terms.",
                    budgetMin: 50000,
                    budgetMax: 90000,
                    experienceLevel: "mid",
                    deadline: "2027-12-31T23:59:59.000Z",
                });

            expect(isolatedProjectResponse.statusCode).toBe(201);
            isolatedProjectId =
                isolatedProjectResponse.body.data.project.id;

            const isolatedProposalResponse = await request(app)
                .post(
                    `/api/projects/${isolatedProjectId}/proposals`
                )
                .set(
                    "Authorization",
                    authorizationHeader(freelancerToken)
                )
                .send({
                    coverLetter: "Proposal for rollback testing.",
                    proposedBudget: 62000,
                    estimatedDays: 18,
                });

            expect(isolatedProposalResponse.statusCode).toBe(201);
            isolatedProposalId =
                isolatedProposalResponse.body.data.proposal.id;

            const projectResult = await pool.query(
                "SELECT client_id FROM projects WHERE id = $1",
                [isolatedProjectId]
            );

            const existingContract = await pool.query(
                `INSERT INTO contracts
                    (
                        proposal_id,
                        project_id,
                        client_id,
                        freelancer_id,
                        agreed_amount,
                        terms
                    )
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [
                    isolatedProposalId,
                    isolatedProjectId,
                    projectResult.rows[0].client_id,
                    2,
                    62000,
                    "Initial contract terms.",
                ]
            );
            seededContractId = existingContract.rows[0].id;

            const acceptanceResponse = await request(app)
                .patch(
                    `/api/projects/${isolatedProjectId}/proposals/${isolatedProposalId}/status`
                )
                .set(
                    "Authorization",
                    authorizationHeader(clientToken)
                )
                .send({
                    status: "accepted",
                });

            expect(acceptanceResponse.statusCode).toBe(409);
            expect(acceptanceResponse.body).toEqual({
                success: false,
                message: "A contract already exists for this proposal",
            });

            const proposalResult = await pool.query(
                "SELECT status FROM proposals WHERE id = $1",
                [isolatedProposalId]
            );
            expect(proposalResult.rows[0].status).toBe("pending");

            const projectStatusResult = await pool.query(
                "SELECT status FROM projects WHERE id = $1",
                [isolatedProjectId]
            );
            expect(projectStatusResult.rows[0].status).toBe("open");

            const contractResult = await pool.query(
                "SELECT COUNT(*) FROM contracts WHERE proposal_id = $1",
                [isolatedProposalId]
            );
            expect(Number(contractResult.rows[0].count)).toBe(1);
        } finally {
            if (seededContractId) {
                await pool.query(
                    "DELETE FROM contracts WHERE id = $1",
                    [seededContractId]
                );
            }

            if (isolatedProposalId) {
                await pool.query(
                    "DELETE FROM proposals WHERE id = $1",
                    [isolatedProposalId]
                );
            }

            if (isolatedProjectId) {
                await pool.query(
                    "DELETE FROM projects WHERE id = $1",
                    [isolatedProjectId]
                );
            }
        }
    });

    test("PATCH proposal status should reject accepting another proposal after one is accepted", async () => {
        await pool.query(
            "UPDATE proposals SET status = 'pending' WHERE id = $1",
            [thirdProposalId]
        );

        const response = await request(app)
            .patch(
                `/api/projects/${projectId}/proposals/${thirdProposalId}/status`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                status: "accepted",
            });

        expect(response.statusCode).toBe(409);

        expect(response.body).toEqual({
            success: false,
            message:
                "Another proposal has already been accepted for this project",
        });
    });
});