const request = require("supertest");

const app = require("../src/app");
const pool = require("../src/config/db");

describe("Reviews API", () => {
    let clientToken;
    let freelancerToken;
    let secondFreelancerToken;

    let companyId;
    let projectId;
    let proposalId;

    let clientReviewId;
    let freelancerReviewId;
    let ratingTestProjectId;
    let ratingTestReviewIds = [];

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
                name: "TalentBridge Review Test Company",
                description:
                    "Company created for review API tests.",
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
                title: "Automated Review Test Project",
                description:
                    "Temporary project for review API testing.",
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

        const proposalResponse = await request(app)
            .post(
                `/api/projects/${projectId}/proposals`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "I would like to work on this project.",
                proposedBudget: 60000,
                estimatedDays: 15,
            });

        expect(proposalResponse.statusCode).toBe(201);

        proposalId =
            proposalResponse.body.data.proposal.id;

        const acceptResponse = await request(app)
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

        expect(acceptResponse.statusCode).toBe(200);

        expect(
            acceptResponse.body.data.project.status
        ).toBe("in_progress");

        const completeResponse = await request(app)
            .patch(
                `/api/projects/${projectId}/complete`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(completeResponse.statusCode).toBe(200);

        expect(
            completeResponse.body.data.project.status
        ).toBe("completed");
    });

    afterAll(async () => {
        if (ratingTestReviewIds.length > 0) {
            await pool.query(
                "DELETE FROM reviews WHERE id = ANY($1::bigint[])",
                [ratingTestReviewIds]
            );
        }

        if (ratingTestProjectId) {
            await pool.query(
                "DELETE FROM projects WHERE id = $1",
                [ratingTestProjectId]
            );
        }

        if (clientReviewId) {
            await pool.query(
                "DELETE FROM reviews WHERE id = $1",
                [clientReviewId]
            );
        }

        if (freelancerReviewId) {
            await pool.query(
                "DELETE FROM reviews WHERE id = $1",
                [freelancerReviewId]
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

        if (companyId) {
            await pool.query(
                "DELETE FROM companies WHERE id = $1",
                [companyId]
            );
        }
    });

    test("POST review should reject request without token", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .send({
                revieweeId: 2,
                rating: 5,
                comment: "Great work.",
            });

        expect(response.statusCode).toBe(401);

        expect(response.body).toEqual({
            success: false,
            message: "Authentication required",
        });
    });

    test("POST review should reject missing reviewee ID", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                rating: 5,
                comment: "Great work.",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Reviewee ID is required",
        });
    });

    test("POST review should reject invalid rating", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                revieweeId: 2,
                rating: 6,
                comment: "Great work.",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Rating must be between 1 and 5",
        });
    });

    test("POST review should reject non-existent project", async () => {
        const response = await request(app)
            .post(
                "/api/projects/999999999/reviews"
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                revieweeId: 2,
                rating: 5,
                comment: "Great work.",
            });

        expect(response.statusCode).toBe(404);

        expect(response.body).toEqual({
            success: false,
            message: "Project not found",
        });
    });

    test("POST review should reject review on incomplete project", async () => {
        const result = await pool.query(
            `INSERT INTO projects (
                client_id,
                title,
                description,
                budget_min,
                budget_max,
                experience_level,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'open')
            RETURNING id`,
            [
                3,
                "Incomplete Review Test Project",
                "Temporary incomplete project.",
                10000,
                20000,
                "mid",
            ]
        );

        const incompleteProjectId =
            result.rows[0].id;

        const response = await request(app)
            .post(
                `/api/projects/${incompleteProjectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                revieweeId: 2,
                rating: 5,
                comment: "Great work.",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "Reviews can only be submitted for completed projects",
        });

        await pool.query(
            "DELETE FROM projects WHERE id = $1",
            [incompleteProjectId]
        );
    });

    test("POST review should reject self-review", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                revieweeId: 3,
                rating: 5,
                comment: "Self review.",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "You cannot review yourself",
        });
    });

    test("POST review should reject unauthorized user", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${secondFreelancerToken}`
            )
            .send({
                revieweeId: 3,
                rating: 5,
                comment: "Great client.",
            });

        expect(response.statusCode).toBe(403);

        expect(response.body).toEqual({
            success: false,
            message:
                "You are not allowed to review participants of this project",
        });
    });

    test("POST review should reject invalid reviewee", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                revieweeId: 4,
                rating: 5,
                comment: "Great work.",
            });

        expect(response.statusCode).toBe(403);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid reviewee for this project",
        });
    });

    test("POST review should allow client to review accepted freelancer", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                revieweeId: 2,
                rating: 5,
                comment:
                    "Excellent work and communication.",
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Review submitted successfully"
        );

        expect(
            response.body.data.review
        ).toMatchObject({
            reviewer_id: 3,
            reviewee_id: 2,
            project_id: projectId,
            rating: 5,
            comment:
                "Excellent work and communication.",
        });

        clientReviewId =
            response.body.data.review.id;

        expect(clientReviewId).toEqual(
            expect.any(String)
        );
    });

    test("POST review should reject duplicate client review", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                revieweeId: 2,
                rating: 4,
                comment: "Another review.",
            });

        expect(response.statusCode).toBe(409);

        expect(response.body).toEqual({
            success: false,
            message:
                "You have already reviewed this user for this project",
        });
    });

    test("POST review should allow accepted freelancer to review client", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                revieweeId: 3,
                rating: 4,
                comment:
                    "Great client with clear requirements.",
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(
            response.body.data.review
        ).toMatchObject({
            reviewer_id: 2,
            reviewee_id: 3,
            project_id: projectId,
            rating: 4,
            comment:
                "Great client with clear requirements.",
        });

        freelancerReviewId =
            response.body.data.review.id;

        expect(freelancerReviewId).toEqual(
            expect.any(String)
        );
    });

    test("POST review should reject duplicate freelancer review", async () => {
        const response = await request(app)
            .post(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                revieweeId: 3,
                rating: 5,
                comment: "Another client review.",
            });

        expect(response.statusCode).toBe(409);

        expect(response.body).toEqual({
            success: false,
            message:
                "You have already reviewed this user for this project",
        });
    });

    test("GET project reviews should return project reviews", async () => {
        const response = await request(app)
            .get(
                `/api/projects/${projectId}/reviews`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(
                response.body.data.reviews
            )
        ).toBe(true);

        expect(
            response.body.data.reviews.length
        ).toBe(2);

        const clientReview =
            response.body.data.reviews.find(
                (review) =>
                    review.id === clientReviewId
            );

        expect(clientReview).toBeDefined();

        expect(clientReview).toMatchObject({
            reviewer_id: 3,
            reviewee_id: 2,
            project_id: projectId,
            rating: 5,
            reviewer_name:
                "TalentBridge Client",
        });

        const freelancerReview =
            response.body.data.reviews.find(
                (review) =>
                    review.id === freelancerReviewId
            );

        expect(freelancerReview).toBeDefined();

        expect(freelancerReview).toMatchObject({
            reviewer_id: 2,
            reviewee_id: 3,
            project_id: projectId,
            rating: 4,
            reviewer_name:
                "Himanshu Test",
        });
    });

    test("GET user reviews should return reviews received by freelancer", async () => {
        const response = await request(app)
            .get("/api/users/2/reviews")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(
                response.body.data.reviews
            )
        ).toBe(true);

        const review =
            response.body.data.reviews.find(
                (item) =>
                    item.id === clientReviewId
            );

        expect(review).toBeDefined();

        expect(review).toMatchObject({
            id: clientReviewId,
            reviewer_id: 3,
            reviewee_id: 2,
            project_id: projectId,
            rating: 5,
            reviewer_name:
                "TalentBridge Client",
            project_title:
                "Automated Review Test Project",
        });
    });

    test("GET user reviews should return reviews received by client", async () => {
        const response = await request(app)
            .get("/api/users/3/reviews")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(
                response.body.data.reviews
            )
        ).toBe(true);

        const review =
            response.body.data.reviews.find(
                (item) =>
                    item.id === freelancerReviewId
            );

        expect(review).toBeDefined();

        expect(review).toMatchObject({
            id: freelancerReviewId,
            reviewer_id: 2,
            reviewee_id: 3,
            project_id: projectId,
            rating: 4,
            reviewer_name:
                "Himanshu Test",
            project_title:
                "Automated Review Test Project",
        });
    });

    test("GET user rating should return average rating and review count", async () => {
        const userResult = await pool.query(
            `SELECT u.id
             FROM users u
             WHERE u.id NOT IN (2, 3)
               AND NOT EXISTS (
                   SELECT 1
                   FROM reviews r
                   WHERE r.reviewee_id = u.id
               )
             ORDER BY u.id
             LIMIT 1`
        );
        expect(userResult.rows.length).toBeGreaterThan(0);

        const revieweeId = userResult.rows[0].id;
        const projectResponse = await request(app)
            .post("/api/projects")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId,
                title: "Automated Rating Test Project",
                description:
                    "Temporary project for deterministic rating tests.",
            });

        ratingTestProjectId =
            projectResponse.body.data?.project?.id;
        expect(projectResponse.statusCode).toBe(201);

        const reviewResult = await pool.query(
            `INSERT INTO reviews (
                reviewer_id,
                reviewee_id,
                project_id,
                rating
             )
             VALUES
                (3, $1, $2, 4),
                (2, $1, $2, 4),
                (3, $1, $3, 5)
             RETURNING id`,
            [revieweeId, projectId, ratingTestProjectId]
        );
        ratingTestReviewIds = reviewResult.rows.map(
            (row) => row.id
        );

        const response = await request(app)
            .get(`/api/users/${revieweeId}/rating`)
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data).toEqual({
            averageRating: 4.33,
            reviewCount: 3,
        });

        await pool.query(
            "DELETE FROM reviews WHERE id = ANY($1::bigint[])",
            [ratingTestReviewIds]
        );
        ratingTestReviewIds = [];

        await pool.query(
            "DELETE FROM projects WHERE id = $1",
            [ratingTestProjectId]
        );
        ratingTestProjectId = null;
    });

    test("GET user rating should return zero for a user with no reviews", async () => {
        const result = await pool.query(
            `SELECT id
             FROM users
             WHERE id NOT IN (
                 SELECT DISTINCT reviewee_id
                 FROM reviews
             )
             ORDER BY id
             LIMIT 1`
        );

        expect(result.rows.length).toBeGreaterThan(0);

        const userId = result.rows[0].id;

        const response = await request(app)
            .get(`/api/users/${userId}/rating`)
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data).toEqual({
            averageRating: 0,
            reviewCount: 0,
        });
    });

    test("GET user rating should reject invalid user ID", async () => {
        const response = await request(app)
            .get("/api/users/invalid/rating")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid user ID",
        });
    });

    test("GET user rating should require authentication", async () => {
        const response = await request(app)
            .get("/api/users/2/rating");

        expect(response.statusCode).toBe(401);

        expect(response.body).toEqual({
            success: false,
            message: "Authentication required",
        });
    });
});