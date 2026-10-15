const jwt = require("jsonwebtoken");
const request = require("supertest");

const app = require("../src/app");
const pool = require("../src/config/db");

describe("Contract completion API", () => {
    let clientToken;
    let freelancerToken;
    let secondFreelancerToken;
    let adminToken;
    let clientId;
    let freelancerId;
    let secondFreelancerId;
    let contractId;
    let proposalId;
    let projectId;

    const authorizationHeader = (token) =>
        ["Bearer", token].join(" ");

    const createContract = async (status = "active") => {
        const projectResult = await pool.query(
            `INSERT INTO projects
                (client_id, title, description, status)
             VALUES ($1, $2, $3, 'in_progress')
             RETURNING id`,
            [
                clientId,
                "Contract Completion Test Project",
                "Contract completion test terms.",
            ]
        );
        projectId = projectResult.rows[0].id;

        const proposalResult = await pool.query(
            `INSERT INTO proposals
                (
                    project_id,
                    freelancer_id,
                    cover_letter,
                    proposed_budget,
                    estimated_days,
                    status
                )
             VALUES ($1, $2, $3, $4, $5, 'accepted')
             RETURNING id`,
            [
                projectId,
                freelancerId,
                "Proposal for contract completion testing.",
                55000,
                20,
            ]
        );
        proposalId = proposalResult.rows[0].id;

        const contractResult = await pool.query(
            `INSERT INTO contracts
                (
                    proposal_id,
                    project_id,
                    client_id,
                    freelancer_id,
                    agreed_amount,
                    terms,
                    status,
                    updated_at
                )
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '1 day')
             RETURNING id`,
            [
                proposalId,
                projectId,
                clientId,
                freelancerId,
                55000,
                "Contract completion test terms.",
                status,
            ]
        );
        contractId = contractResult.rows[0].id;
    };

    const markContractWorkSubmitted = async () => {
        await pool.query(
            "UPDATE contracts SET status = 'work_submitted' WHERE id = $1",
            [contractId],
        );
    };

    const createContractPayment = async ({
        status = "funded",
        providerPaymentReference = `payment-${contractId}`,
    } = {}) => {
        await pool.query(
            `INSERT INTO contract_payments (
                contract_id,
                client_id,
                freelancer_id,
                amount,
                agreed_amount_snapshot,
                currency,
                provider,
                provider_order_reference,
                provider_payment_reference,
                idempotency_key,
                status
             )
             VALUES ($1, $2, $3, 55000, 55000, 'INR', 'razorpay',
                     $4, $5, $6, $7)`,
            [
                contractId,
                clientId,
                freelancerId,
                `order-${contractId}`,
                providerPaymentReference,
                `contract-payment-${contractId}`,
                status,
            ],
        );
    };

    const createWorkSubmission = async (
        submissionContractId = contractId,
        submissionFreelancerId = freelancerId,
        message = "Work submitted for contract review.",
    ) => {
        const result = await pool.query(
            `INSERT INTO contract_work_submissions (
                contract_id,
                freelancer_id,
                message,
                submission_url
             )
             VALUES ($1, $2, $3, $4)
             RETURNING id, message, submission_url, submitted_at, freelancer_id`,
            [
                submissionContractId,
                submissionFreelancerId,
                message,
                "https://example.com/submitted-work",
            ],
        );
        return result.rows[0];
    };

    const createAdditionalContract = async () => {
        const additionalProjectResult = await pool.query(
            `INSERT INTO projects
                (client_id, title, description, status)
             VALUES ($1, $2, $3, 'in_progress')
             RETURNING id`,
            [
                clientId,
                "Additional Contract Test Project",
                "Additional contract test terms.",
            ],
        );
        const additionalProjectId = additionalProjectResult.rows[0].id;

        const additionalProposalResult = await pool.query(
            `INSERT INTO proposals
                (
                    project_id,
                    freelancer_id,
                    cover_letter,
                    proposed_budget,
                    estimated_days,
                    status
                )
             VALUES ($1, $2, $3, $4, $5, 'accepted')
             RETURNING id`,
            [
                additionalProjectId,
                freelancerId,
                "Additional contract test proposal.",
                55000,
                20,
            ],
        );
        const additionalProposalId = additionalProposalResult.rows[0].id;

        const additionalContractResult = await pool.query(
            `INSERT INTO contracts
                (
                    proposal_id,
                    project_id,
                    client_id,
                    freelancer_id,
                    agreed_amount,
                    terms,
                    status
                )
             VALUES ($1, $2, $3, $4, $5, $6, 'work_submitted')
             RETURNING id`,
            [
                additionalProposalId,
                additionalProjectId,
                clientId,
                freelancerId,
                55000,
                "Additional contract test terms.",
            ],
        );

        return {
            contractId: additionalContractResult.rows[0].id,
            proposalId: additionalProposalId,
            projectId: additionalProjectId,
        };
    };

    const cleanupContract = async () => {
        if (contractId) {
            await pool.query(
                `DELETE FROM notifications
                 WHERE reference_type = 'contract'
                   AND reference_id = $1`,
                [contractId]
            );
            await pool.query(
                "DELETE FROM contract_payments WHERE contract_id = $1",
                [contractId],
            );
            await pool.query(
                "DELETE FROM contracts WHERE id = $1",
                [contractId]
            );
        }

        if (proposalId) {
            await pool.query(
                "DELETE FROM proposals WHERE id = $1",
                [proposalId]
            );
        }

        if (projectId) {
            await pool.query(
                "DELETE FROM projects WHERE id = $1",
                [projectId]
            );
        }

        contractId = null;
        proposalId = null;
        projectId = null;
    };

    beforeAll(async () => {
        const clientLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "client.test@example.com",
                password: "ClientPassword123",
            });
        expect(clientLogin.statusCode).toBe(200);
        clientToken = clientLogin.body.data.token;
        clientId = clientLogin.body.data.user.id;

        const freelancerLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "himanshu.test@example.com",
                password: "TestPassword123",
            });
        expect(freelancerLogin.statusCode).toBe(200);
        freelancerToken = freelancerLogin.body.data.token;
        freelancerId = freelancerLogin.body.data.user.id;

        const secondFreelancerLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "freelancer2.test@example.com",
                password: "TestPassword456",
            });
        expect(secondFreelancerLogin.statusCode).toBe(200);
        secondFreelancerToken =
            secondFreelancerLogin.body.data.token;
        secondFreelancerId =
            secondFreelancerLogin.body.data.user.id;

        adminToken = jwt.sign(
            {
                userId: secondFreelancerId,
                role: "admin",
            },
            process.env.JWT_SECRET
        );
    });

    afterEach(cleanupContract);

    test("contract details prefer a funded payment over a newer pending attempt", async () => {
        await createContract();

        try {
            await pool.query(
                `INSERT INTO contract_payments (
                    contract_id,
                    client_id,
                    freelancer_id,
                    amount,
                    agreed_amount_snapshot,
                    currency,
                    provider,
                    provider_order_reference,
                    provider_payment_reference,
                    idempotency_key,
                    status
                )
                VALUES
                    ($1, $2, $3, 55000, 55000, 'INR', 'razorpay',
                     'order_funded_test', 'payment_funded_test',
                     'contract-test-funded', 'funded'),
                    ($1, $2, $3, 55000, 55000, 'INR', 'razorpay',
                     'order_pending_test', NULL,
                     'contract-test-pending', 'funding_pending')`,
                [contractId, clientId, freelancerId],
            );

            const response = await request(app)
                .get(`/api/contracts/${contractId}`)
                .set("Authorization", authorizationHeader(clientToken));

            expect(response.statusCode).toBe(200);
            expect(response.body.data.payment).toMatchObject({
                status: "funded",
                provider_order_reference: "order_funded_test",
                provider_payment_reference: "payment_funded_test",
                amount: "55000.00",
                currency: "INR",
                provider: "razorpay",
            });
            expect(response.body.data.workSubmission).toBeNull();
        } finally {
            await pool.query(
                "DELETE FROM contract_payments WHERE contract_id = $1",
                [contractId],
            );
        }
    });

    test("active contract details return no work submission", async () => {
        await createContract("active");

        const response = await request(app)
            .get(`/api/contracts/${contractId}`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(200);
        expect(response.body.data.workSubmission).toBeNull();
    });

    test("work-submitted contract details return the safe submission fields", async () => {
        await createContract("work_submitted");
        const submission = await createWorkSubmission();

        const response = await request(app)
            .get(`/api/contracts/${contractId}`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(200);
        expect(response.body.data.workSubmission).toEqual({
            id: String(submission.id),
            message: submission.message,
            submission_url: submission.submission_url,
            submitted_at: submission.submitted_at.toISOString(),
            freelancer_id: submission.freelancer_id,
        });
    });

    test("completed contract details continue returning the work submission", async () => {
        await createContract("completed");
        const submission = await createWorkSubmission();

        const response = await request(app)
            .get(`/api/contracts/${contractId}`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(200);
        expect(response.body.data.workSubmission).toMatchObject({
            id: String(submission.id),
            message: submission.message,
            submission_url: submission.submission_url,
            freelancer_id: submission.freelancer_id,
        });
    });

    test("contract details return only the submission belonging to the requested contract", async () => {
        await createContract("work_submitted");
        const requestedSubmission = await createWorkSubmission(
            contractId,
            freelancerId,
            "Submission for the requested contract.",
        );
        const additionalContract = await createAdditionalContract();

        try {
            await createWorkSubmission(
                additionalContract.contractId,
                freelancerId,
                "Submission for another contract.",
            );

            const response = await request(app)
                .get(`/api/contracts/${contractId}`)
                .set("Authorization", authorizationHeader(clientToken));

            expect(response.statusCode).toBe(200);
            expect(response.body.data.workSubmission).toMatchObject({
                id: String(requestedSubmission.id),
                message: "Submission for the requested contract.",
            });
        } finally {
            await pool.query(
                "DELETE FROM contracts WHERE id = $1",
                [additionalContract.contractId],
            );
            await pool.query(
                "DELETE FROM proposals WHERE id = $1",
                [additionalContract.proposalId],
            );
            await pool.query(
                "DELETE FROM projects WHERE id = $1",
                [additionalContract.projectId],
            );
        }
    });

        test("freelancer can submit work for an active contract", async () => {
        await createContract();
            await createContractPayment();

            const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            )
            .send({
                message: "I have completed the requested work.",
                submission_url: "https://github.com/example/project",
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toMatchObject({
            success: true,
            message: "Work submitted successfully",
        });

        const contractResult = await pool.query(
            "SELECT status FROM contracts WHERE id = $1",
            [contractId]
        );

        expect(contractResult.rows[0].status).toBe("work_submitted");

        const submissionResult = await pool.query(
            `SELECT
                contract_id,
                freelancer_id,
                message,
                submission_url
             FROM contract_work_submissions
             WHERE contract_id = $1`,
            [contractId]
        );

        expect(submissionResult.rowCount).toBe(1);
        expect(submissionResult.rows[0]).toMatchObject({
            contract_id: String(contractId),
            freelancer_id: freelancerId,
            message: "I have completed the requested work.",
            submission_url: "https://github.com/example/project",
        });

        const notificationResult = await pool.query(
            `SELECT user_id, type, reference_type, reference_id
             FROM notifications
             WHERE reference_type = 'contract'
               AND reference_id = $1`,
            [contractId]
        );

        expect(notificationResult.rowCount).toBe(1);
        expect(notificationResult.rows[0]).toMatchObject({
            user_id: clientId,
            type: "work_submitted",
            reference_type: "contract",
            reference_id: contractId,
        });
    });

    test.each([
        ["no payment", null],
        ["funding_pending payment", {
            status: "funding_pending",
            providerPaymentReference: null,
        }],
        ["funding_pending payment with checkout reference", {
            status: "funding_pending",
            providerPaymentReference: "signature-reference-test",
        }],
    ])("freelancer cannot submit work with %s", async (_label, payment) => {
        await createContract();
        if (payment) {
            await createContractPayment(payment);
        }

        const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set("Authorization", authorizationHeader(freelancerToken))
            .send({
                message: "Submission before confirmed funding.",
            });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe(
            "Contract payment must be confirmed before work can be submitted",
        );

        const contractResult = await pool.query(
            "SELECT status FROM contracts WHERE id = $1",
            [contractId],
        );
        const submissionResult = await pool.query(
            "SELECT id FROM contract_work_submissions WHERE contract_id = $1",
            [contractId],
        );
        expect(contractResult.rows[0].status).toBe("active");
        expect(submissionResult.rowCount).toBe(0);
    });

    test("submission waits for a locked pending payment to become funded", async () => {
        await createContract();
        await createContractPayment({
            status: "funding_pending",
            providerPaymentReference: null,
        });

        const paymentLockClient = await pool.connect();
        let transactionOpen = false;
        let submissionPromise;

        try {
            await paymentLockClient.query("BEGIN");
            transactionOpen = true;
            await paymentLockClient.query(
                `SELECT id
                 FROM contract_payments
                 WHERE contract_id = $1
                 FOR UPDATE`,
                [contractId],
            );

            submissionPromise = request(app)
                .post(`/api/contracts/${contractId}/submit-work`)
                .set("Authorization", authorizationHeader(freelancerToken))
                .send({
                    message: "Submission concurrent with payment capture.",
                })
                .then((response) => response);

            let submissionWaitingForPayment = false;
            for (let attempt = 0; attempt < 100; attempt += 1) {
                const activityResult = await paymentLockClient.query(
                    `SELECT EXISTS (
                        SELECT 1
                        FROM pg_stat_activity
                        WHERE datname = current_database()
                          AND pid <> pg_backend_pid()
                          AND state = 'active'
                          AND wait_event_type = 'Lock'
                          AND query ILIKE '%contract_payments%'
                    ) AS waiting`,
                );

                if (activityResult.rows[0].waiting) {
                    submissionWaitingForPayment = true;
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, 10));
            }

            expect(submissionWaitingForPayment).toBe(true);

            await paymentLockClient.query(
                `UPDATE contract_payments
                 SET status = 'funded',
                     provider_payment_reference = $2
                 WHERE contract_id = $1`,
                [contractId, `captured-payment-${contractId}`],
            );
            await paymentLockClient.query("COMMIT");
            transactionOpen = false;

            const response = await submissionPromise;
            expect(response.statusCode).toBe(201);

            const contractResult = await pool.query(
                "SELECT status FROM contracts WHERE id = $1",
                [contractId],
            );
            expect(contractResult.rows[0].status).toBe("work_submitted");
        } finally {
            if (transactionOpen) {
                await paymentLockClient.query("ROLLBACK");
            }
            await submissionPromise?.catch(() => {});
            paymentLockClient.release();
        }
    });

    test("client cannot submit work", async () => {
        await createContract();

        const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(clientToken)
            )
            .send({
                message: "Client attempting submission.",
            });

        expect(response.statusCode).toBe(403);
    });

    test("admin cannot submit work", async () => {
        await createContract();

        const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(adminToken)
            )
            .send({
                message: "Admin attempting submission.",
            });

        expect(response.statusCode).toBe(403);
    });

    test("unrelated freelancer cannot submit work", async () => {
        await createContract();

        const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(secondFreelancerToken)
            )
            .send({
                message: "Unrelated freelancer attempting submission.",
            });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe(
            "Only the contract freelancer can submit work"
        );
    });

    test("unauthenticated users cannot submit work", async () => {
        await createContract();

        const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .send({
                message: "Unauthenticated submission.",
            });

        expect(response.statusCode).toBe(401);
    });

    test("submission message is required", async () => {
        await createContract();

        const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            )
            .send({
                submission_url: "https://github.com/example/project",
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe(
            "Submission message is required"
        );
    });

    test("submission URL is optional", async () => {
        await createContract();
        await createContractPayment();

        const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            )
            .send({
                message: "Work completed without an external URL.",
            });

        expect(response.statusCode).toBe(201);

        const submissionResult = await pool.query(
            `SELECT submission_url
             FROM contract_work_submissions
             WHERE contract_id = $1`,
            [contractId]
        );

        expect(submissionResult.rows[0].submission_url).toBeNull();
    });

    test("work cannot be submitted twice", async () => {
        await createContract();
        await createContractPayment();

        const firstResponse = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            )
            .send({
                message: "First submission.",
            });

        expect(firstResponse.statusCode).toBe(201);

        const secondResponse = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            )
            .send({
                message: "Second submission.",
            });

        expect(secondResponse.statusCode).toBe(409);
        expect(secondResponse.body.message).toBe(
            "Work has already been submitted for this contract"
        );
    });

    test("completed contracts cannot accept work submissions", async () => {
        await createContract("completed");

        const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            )
            .send({
                message: "Submission after completion.",
            });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe(
            "Only active contracts can accept a work submission"
        );
    });

    test("cancelled contracts cannot accept work submissions", async () => {
        await createContract("cancelled");

        const response = await request(app)
            .post(`/api/contracts/${contractId}/submit-work`)
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            )
            .send({
                message: "Submission after cancellation.",
            });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe(
            "Only active contracts can accept a work submission"
        );
    });

    test("client can approve submitted work and notify the freelancer after completion", async () => {
        await createContract();
        await markContractWorkSubmitted();
        await createContractPayment();

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/approve`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            message: "Contract work approved successfully",
            data: {
                contract: {
                    id: contractId,
                    status: "completed",
                },
            },
        });

        const contractResult = await pool.query(
            "SELECT status FROM contracts WHERE id = $1",
            [contractId],
        );
        expect(contractResult.rows[0].status).toBe("completed");

        const projectResult = await pool.query(
            "SELECT status FROM projects WHERE id = $1",
            [projectId],
        );
        expect(projectResult.rows[0].status).toBe("completed");

        const notificationResult = await pool.query(
            `SELECT user_id, type, title, message, reference_type, reference_id
             FROM notifications
             WHERE reference_type = 'contract'
               AND reference_id = $1`,
            [contractId],
        );
        expect(notificationResult.rows).toEqual([
            expect.objectContaining({
                user_id: freelancerId,
                type: "contract_completed",
                title: "Work Approved - Contract Completed",
                message:
                    "The client approved your submitted work and the contract is completed.",
                reference_type: "contract",
                reference_id: contractId,
            }),
        ]);
    });

    test.each([
        ["no payment", null],
        ["funding_pending payment", {
            status: "funding_pending",
            providerPaymentReference: null,
        }],
        ["funding_pending payment with checkout reference", {
            status: "funding_pending",
            providerPaymentReference: "signature-reference-test",
        }],
    ])("client cannot approve submitted work with %s", async (_label, payment) => {
        await createContract("work_submitted");
        await createWorkSubmission();
        if (payment) {
            await createContractPayment(payment);
        }

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/approve`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe(
            "Contract payment must be confirmed before work can be approved",
        );

        const contractResult = await pool.query(
            "SELECT status FROM contracts WHERE id = $1",
            [contractId],
        );
        const projectResult = await pool.query(
            "SELECT status FROM projects WHERE id = $1",
            [projectId],
        );
        const notificationResult = await pool.query(
            `SELECT id FROM notifications
             WHERE reference_type = 'contract' AND reference_id = $1`,
            [contractId],
        );
        expect(contractResult.rows[0].status).toBe("work_submitted");
        expect(projectResult.rows[0].status).toBe("in_progress");
        expect(notificationResult.rowCount).toBe(0);
    });

    test("freelancer cannot approve submitted work", async () => {
        await createContract();
        await markContractWorkSubmitted();

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/approve`)
            .set("Authorization", authorizationHeader(freelancerToken));

        expect(response.statusCode).toBe(403);
    });

    test("admin cannot approve submitted work", async () => {
        await createContract();
        await markContractWorkSubmitted();

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/approve`)
            .set("Authorization", authorizationHeader(adminToken));

        expect(response.statusCode).toBe(403);
    });

    test("unrelated client cannot approve submitted work", async () => {
        await createContract();
        await markContractWorkSubmitted();
        const unrelatedClientToken = jwt.sign(
            {
                userId: secondFreelancerId,
                role: "client",
            },
            process.env.JWT_SECRET,
        );

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/approve`)
            .set(
                "Authorization",
                authorizationHeader(unrelatedClientToken),
            );

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe(
            "Only the contract client can approve work",
        );
    });

    test("unauthenticated users cannot approve submitted work", async () => {
        await createContract();
        await markContractWorkSubmitted();

        const response = await request(app).patch(
            `/api/contracts/${contractId}/approve`,
        );

        expect(response.statusCode).toBe(401);
    });

    test("approval returns 404 for a missing contract", async () => {
        const response = await request(app)
            .patch("/api/contracts/9223372036854775807/approve")
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe("Contract not found");
    });

    test("approval returns 400 for an invalid contract ID", async () => {
        const response = await request(app)
            .patch("/api/contracts/not-an-id/approve")
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Invalid contract ID");
    });

    test.each(["active", "completed", "cancelled"])(
        "contract with status %s cannot be approved",
        async (status) => {
            await createContract(status);

            const response = await request(app)
                .patch(`/api/contracts/${contractId}/approve`)
                .set("Authorization", authorizationHeader(clientToken));

            expect(response.statusCode).toBe(409);
            expect(response.body.message).toBe(
                "Only submitted work can be approved for this contract",
            );
        },
    );

    test("concurrent approval attempts produce one success and one conflict", async () => {
        await createContract();
        await markContractWorkSubmitted();
        await createContractPayment();

        const responses = await Promise.all([
            request(app)
                .patch(`/api/contracts/${contractId}/approve`)
                .set("Authorization", authorizationHeader(clientToken)),
            request(app)
                .patch(`/api/contracts/${contractId}/approve`)
                .set("Authorization", authorizationHeader(clientToken)),
        ]);

        expect(responses.map((response) => response.statusCode).sort()).toEqual(
            [200, 409],
        );

        const notificationResult = await pool.query(
            `SELECT id
             FROM notifications
             WHERE reference_type = 'contract'
               AND reference_id = $1
               AND type = 'contract_completed'`,
            [contractId],
        );
        expect(notificationResult.rowCount).toBe(1);
    });

    test("project update failure rolls back approval and does not notify", async () => {
        await createContract();
        await markContractWorkSubmitted();
        await createContractPayment();

        await pool.query(
            `CREATE OR REPLACE FUNCTION project_work_approval_failure_test()
             RETURNS trigger
             LANGUAGE plpgsql
             AS $$
             BEGIN
                 IF NEW.status = 'completed' THEN
                     RAISE EXCEPTION 'Forced project work approval failure';
                 END IF;
                 RETURN NEW;
             END;
             $$`,
        );
        await pool.query(
            `CREATE TRIGGER project_work_approval_failure_test
             AFTER UPDATE ON projects
             FOR EACH ROW
             EXECUTE FUNCTION project_work_approval_failure_test()`,
        );
        const errorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const response = await request(app)
                .patch(`/api/contracts/${contractId}/approve`)
                .set("Authorization", authorizationHeader(clientToken));

            expect(response.statusCode).toBe(500);

            const contractResult = await pool.query(
                "SELECT status FROM contracts WHERE id = $1",
                [contractId],
            );
            expect(contractResult.rows[0].status).toBe("work_submitted");

            const projectResult = await pool.query(
                "SELECT status FROM projects WHERE id = $1",
                [projectId],
            );
            expect(projectResult.rows[0].status).toBe("in_progress");

            const notificationResult = await pool.query(
                `SELECT id
                 FROM notifications
                 WHERE reference_type = 'contract'
                   AND reference_id = $1
                   AND type = 'contract_completed'`,
                [contractId],
            );
            expect(notificationResult.rowCount).toBe(0);
        } finally {
            await pool.query(
                "DROP TRIGGER IF EXISTS project_work_approval_failure_test ON projects",
            );
            await pool.query(
                "DROP FUNCTION IF EXISTS project_work_approval_failure_test()",
            );
            errorSpy.mockRestore();
        }
    });

    test("client cannot complete an active contract through the legacy route", async () => {
        await createContract();

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(409);

        const result = await pool.query(
            "SELECT status FROM contracts WHERE id = $1",
            [contractId]
        );
        expect(result.rows[0].status).toBe("active");
    });

    test("freelancer cannot complete an active contract through the legacy route", async () => {
        await createContract();

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set(
                "Authorization",
                authorizationHeader(freelancerToken)
            );

        expect(response.statusCode).toBe(403);

        const result = await pool.query(
            "SELECT status FROM contracts WHERE id = $1",
            [contractId]
        );
        expect(result.rows[0].status).toBe("active");
    });

    test("unauthenticated users cannot complete a contract", async () => {
        await createContract();

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`);

        expect(response.statusCode).toBe(401);
    });

    test("unrelated freelancers cannot use the legacy completion route", async () => {
        await createContract();

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set(
                "Authorization",
                authorizationHeader(secondFreelancerToken)
            );

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe(
            "You do not have permission to perform this action"
        );
    });

    test("admins cannot complete contracts", async () => {
        await createContract();

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set("Authorization", authorizationHeader(adminToken));

        expect(response.statusCode).toBe(403);
    });

    test("client can use the legacy route to approve submitted work", async () => {
        await createContract("work_submitted");
        await createWorkSubmission();
        await createContractPayment();

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            message: "Contract work approved successfully",
            data: {
                contract: {
                    id: contractId,
                    status: "completed",
                },
            },
        });

        const contractResult = await pool.query(
            "SELECT status FROM contracts WHERE id = $1",
            [contractId]
        );
        expect(contractResult.rows[0].status).toBe("completed");

        const projectResult = await pool.query(
            "SELECT status FROM projects WHERE id = $1",
            [projectId]
        );
        expect(projectResult.rows[0].status).toBe("completed");

        const notificationResult = await pool.query(
            `SELECT user_id, type
             FROM notifications
             WHERE reference_type = 'contract'
               AND reference_id = $1
               AND type = 'contract_completed'`,
            [contractId]
        );
        expect(notificationResult.rows).toEqual([
            {
                user_id: freelancerId,
                type: "contract_completed",
            },
        ]);
    });

    test.each([
        ["no payment", null],
        ["funding_pending payment", {
            status: "funding_pending",
            providerPaymentReference: "signature-reference-test",
        }],
    ])("legacy completion cannot bypass funding with %s", async (_label, payment) => {
        await createContract("work_submitted");
        await createWorkSubmission();
        if (payment) {
            await createContractPayment(payment);
        }

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe(
            "Contract payment must be confirmed before work can be approved",
        );

        const contractResult = await pool.query(
            "SELECT status FROM contracts WHERE id = $1",
            [contractId],
        );
        const projectResult = await pool.query(
            "SELECT status FROM projects WHERE id = $1",
            [projectId],
        );
        expect(contractResult.rows[0].status).toBe("work_submitted");
        expect(projectResult.rows[0].status).toBe("in_progress");
    });

    test("freelancer cannot use the legacy route when work is submitted", async () => {
        await createContract("work_submitted");

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set("Authorization", authorizationHeader(freelancerToken));

        expect(response.statusCode).toBe(403);
    });

    test("unrelated client cannot use the legacy route", async () => {
        await createContract("work_submitted");
        const unrelatedClientToken = jwt.sign(
            {
                userId: secondFreelancerId,
                role: "client",
            },
            process.env.JWT_SECRET
        );

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set(
                "Authorization",
                authorizationHeader(unrelatedClientToken)
            );

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe(
            "Only the contract client can approve work"
        );
    });

    test("missing contracts return 404", async () => {
        const response = await request(app)
            .patch("/api/contracts/9223372036854775807/complete")
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe("Contract not found");
    });

    test("invalid contract IDs return 400", async () => {
        const response = await request(app)
            .patch("/api/contracts/not-an-id/complete")
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Invalid contract ID");
    });

    test("completed contracts cannot be completed again", async () => {
        await createContract("completed");

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe(
            "Only submitted work can be approved for this contract"
        );
    });

    test("cancelled contracts cannot be completed", async () => {
        await createContract("cancelled");

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe(
            "Only submitted work can be approved for this contract"
        );
    });

    test("completion updates the contract timestamp", async () => {
        await createContract("work_submitted");
        await createWorkSubmission();
        await createContractPayment();
        const previousTimestamp = await pool.query(
            "SELECT updated_at FROM contracts WHERE id = $1",
            [contractId]
        );

        const response = await request(app)
            .patch(`/api/contracts/${contractId}/complete`)
            .set("Authorization", authorizationHeader(clientToken));

        expect(response.statusCode).toBe(200);

        const updatedContract = await pool.query(
            "SELECT updated_at FROM contracts WHERE id = $1",
            [contractId]
        );
        expect(
            new Date(updatedContract.rows[0].updated_at).getTime()
        ).toBeGreaterThan(
            new Date(previousTimestamp.rows[0].updated_at).getTime()
        );
    });

    test("a project update failure rolls back completion and does not notify", async () => {
        await createContract("work_submitted");
        await createWorkSubmission();
        await createContractPayment();

        await pool.query(
            `CREATE OR REPLACE FUNCTION project_completion_failure_test()
             RETURNS trigger
             LANGUAGE plpgsql
             AS $$
             BEGIN
                 IF NEW.status = 'completed' THEN
                     RAISE EXCEPTION 'Forced project completion failure';
                 END IF;
                 RETURN NEW;
             END;
             $$`
        );
        await pool.query(
            `CREATE TRIGGER project_completion_failure_test
             AFTER UPDATE ON projects
             FOR EACH ROW
             EXECUTE FUNCTION project_completion_failure_test()`
        );
        const errorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const response = await request(app)
                .patch(`/api/contracts/${contractId}/complete`)
                .set(
                    "Authorization",
                    authorizationHeader(clientToken)
                );

            expect(response.statusCode).toBe(500);

            const contractResult = await pool.query(
                "SELECT status FROM contracts WHERE id = $1",
                [contractId]
            );
            expect(contractResult.rows[0].status).toBe("work_submitted");

            const projectResult = await pool.query(
                "SELECT status FROM projects WHERE id = $1",
                [projectId]
            );
            expect(projectResult.rows[0].status).toBe("in_progress");

            const notificationResult = await pool.query(
                `SELECT id
                 FROM notifications
                 WHERE reference_type = 'contract'
                   AND reference_id = $1`,
                [contractId]
            );
            expect(notificationResult.rowCount).toBe(0);
        } finally {
            await pool.query(
                "DROP TRIGGER IF EXISTS project_completion_failure_test ON projects"
            );
            await pool.query(
                "DROP FUNCTION IF EXISTS project_completion_failure_test()"
            );
            errorSpy.mockRestore();
        }
    });

    test("concurrent legacy route requests produce one completion and one notification", async () => {
        await createContract("work_submitted");
        await createWorkSubmission();
        await createContractPayment();

        const responses = await Promise.all([
            request(app)
                .patch(`/api/contracts/${contractId}/complete`)
                .set("Authorization", authorizationHeader(clientToken)),
            request(app)
                .patch(`/api/contracts/${contractId}/complete`)
                .set("Authorization", authorizationHeader(clientToken)),
        ]);

        expect(responses.map((response) => response.statusCode).sort()).toEqual(
            [200, 409]
        );

        const contractResult = await pool.query(
            "SELECT status FROM contracts WHERE id = $1",
            [contractId]
        );
        expect(contractResult.rows[0].status).toBe("completed");

        const projectResult = await pool.query(
            "SELECT status FROM projects WHERE id = $1",
            [projectId]
        );
        expect(projectResult.rows[0].status).toBe("completed");

        const notificationResult = await pool.query(
            `SELECT id
             FROM notifications
             WHERE reference_type = 'contract'
               AND reference_id = $1`,
            [contractId]
        );
        expect(notificationResult.rowCount).toBe(1);
    });

    test("concurrent approval and legacy route requests complete once and notify once", async () => {
        await createContract("work_submitted");
        await createWorkSubmission();
        await createContractPayment();

        const responses = await Promise.all([
            request(app)
                .patch(`/api/contracts/${contractId}/approve`)
                .set("Authorization", authorizationHeader(clientToken)),
            request(app)
                .patch(`/api/contracts/${contractId}/complete`)
                .set("Authorization", authorizationHeader(clientToken)),
        ]);

        expect(responses.map((response) => response.statusCode).sort()).toEqual(
            [200, 409]
        );

        const notificationResult = await pool.query(
            `SELECT id
             FROM notifications
             WHERE reference_type = 'contract'
               AND reference_id = $1
               AND type = 'contract_completed'`,
            [contractId]
        );
        expect(notificationResult.rowCount).toBe(1);
    });
});
