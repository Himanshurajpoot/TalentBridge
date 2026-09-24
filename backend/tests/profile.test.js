const request = require("supertest");

const app = require("../src/app");

const pool = require("../src/config/db");

describe("Profile API", () => {
    let clientToken;
    let freelancerToken;

    beforeAll(async () => {
        const clientLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "client.test@example.com",
                password: "ClientPassword123",
            });

        expect(clientLogin.statusCode).toBe(200);

        clientToken = clientLogin.body.data.token;

        const freelancerLogin = await request(app)
            .post("/api/auth/login")
            .send({
                email: "himanshu.test@example.com",
                password: "TestPassword123",
            });

        expect(freelancerLogin.statusCode).toBe(200);

        freelancerToken = freelancerLogin.body.data.token;
    });

    beforeEach(async () => {
        await pool.query(
            `
            DELETE FROM profiles
            WHERE user_id IN (2, 3)
            `
        );
    });

    test("GET /api/profile/me - should reject request without token", async () => {
        const response = await request(app)
            .get("/api/profile/me");

        expect(response.statusCode).toBe(401);
    });

    test("GET /api/profile/me - should return 404 when profile does not exist", async () => {
        const response = await request(app)
            .get("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(404);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "Profile not found"
        );
    });

    test("PUT /api/profile/me - should reject request without token", async () => {
        const response = await request(app)
            .put("/api/profile/me")
            .send({
                bio: "Test bio",
            });

        expect(response.statusCode).toBe(401);
    });

    test("PUT /api/profile/me - should create profile", async () => {
        const response = await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                bio: "Full stack developer",
                headline: "Software Developer",
                location: "Delhi",
                phone: "9876543210",
                avatarUrl: "https://example.com/avatar.jpg",
                resumeUrl: "https://example.com/resume.pdf",
                hourlyRate: 500,
                experienceYears: 1,
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Profile saved successfully"
        );

        expect(response.body.data).toBeDefined();

        expect(
            response.body.data.profile
        ).toBeDefined();

        expect(
            Number(response.body.data.profile.user_id)
        ).toBe(3);

        expect(
            response.body.data.profile.bio
        ).toBe("Full stack developer");

        expect(
            response.body.data.profile.headline
        ).toBe("Software Developer");

        expect(
            response.body.data.profile.location
        ).toBe("Delhi");
    });

    test("GET /api/profile/me - should return existing profile", async () => {
        await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                bio: "Backend developer",
                headline: "Node.js Developer",
                location: "Noida",
                hourlyRate: 700,
                experienceYears: 2,
            });

        const response = await request(app)
            .get("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            response.body.data.profile
        ).toBeDefined();

        expect(
            Number(response.body.data.profile.user_id)
        ).toBe(3);

        expect(
            response.body.data.profile.full_name
        ).toBe("TalentBridge Client");

        expect(
            response.body.data.profile.email
        ).toBe("client.test@example.com");

        expect(
            response.body.data.profile.role
        ).toBe("client");

        expect(
            response.body.data.profile.bio
        ).toBe("Backend developer");
    });

    test("PUT /api/profile/me - should update existing profile", async () => {
        const firstResponse = await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                bio: "Old bio",
                headline: "Old headline",
                hourlyRate: 500,
                experienceYears: 1,
            });

        expect(firstResponse.statusCode).toBe(200);

        const secondResponse = await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                bio: "Updated bio",
                headline: "Updated headline",
                location: "Greater Noida",
                hourlyRate: 1000,
                experienceYears: 3,
            });

        expect(secondResponse.statusCode).toBe(200);

        expect(
            secondResponse.body.data.profile.bio
        ).toBe("Updated bio");

        expect(
            secondResponse.body.data.profile.headline
        ).toBe("Updated headline");

        expect(
            secondResponse.body.data.profile.location
        ).toBe("Greater Noida");
    });

    test("PUT /api/profile/me - should reject negative hourlyRate", async () => {
        const response = await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                hourlyRate: -100,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.message).toBe(
            "hourlyRate must be a valid non-negative number"
        );
    });

    test("PUT /api/profile/me - should reject invalid hourlyRate", async () => {
        const response = await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                hourlyRate: "invalid",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.message).toBe(
            "hourlyRate must be a valid non-negative number"
        );
    });

    test("PUT /api/profile/me - should reject negative experienceYears", async () => {
        const response = await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                experienceYears: -1,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.message).toBe(
            "experienceYears must be a valid non-negative number"
        );
    });

    test("PUT /api/profile/me - should reject invalid experienceYears", async () => {
        const response = await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                experienceYears: "invalid",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.message).toBe(
            "experienceYears must be a valid non-negative number"
        );
    });

    test("PUT /api/profile/me - should accept zero numeric values", async () => {
        const response = await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                hourlyRate: 0,
                experienceYears: 0,
            });

        expect(response.statusCode).toBe(200);

        expect(
            response.body.data.profile.hourly_rate
        ).toBe("0.00");

        expect(
            response.body.data.profile.experience_years
        ).toBe("0.0");
    });

    test("GET /api/profile/me - should only return logged-in user's profile", async () => {
        await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                bio: "Client private profile",
            });

        await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                bio: "Freelancer private profile",
            });

        const clientResponse = await request(app)
            .get("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(clientResponse.statusCode).toBe(200);

        expect(
            clientResponse.body.data.profile.bio
        ).toBe("Client private profile");

        expect(
            Number(
                clientResponse.body.data.profile.user_id
            )
        ).toBe(3);
    });

    test("PUT /api/profile/me - should trim string fields", async () => {
        const response = await request(app)
            .put("/api/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                bio: "   Test bio   ",
                headline: "   Developer   ",
                location: "   Delhi   ",
                phone: "   9876543210   ",
            });

        expect(response.statusCode).toBe(200);

        expect(
            response.body.data.profile.bio
        ).toBe("Test bio");

        expect(
            response.body.data.profile.headline
        ).toBe("Developer");

        expect(
            response.body.data.profile.location
        ).toBe("Delhi");

        expect(
            response.body.data.profile.phone
        ).toBe("9876543210");
    });
});