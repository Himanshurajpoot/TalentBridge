const { randomUUID } = require("crypto");
const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

describe("Authentication API", () => {
    test("POST /api/auth/register should reject admin role and default to client", async () => {
        const email = `auth-admin-role-${randomUUID()}@example.com`;

        try {
            const adminRegistration = await request(app)
                .post("/api/auth/register")
                .send({
                    fullName: "Registration Role Test",
                    email,
                    password: "TestPassword123",
                    role: "admin",
                });

            expect(adminRegistration.statusCode).toBe(400);
            expect(adminRegistration.body.success).toBe(false);

            const afterRejectedRegistration = await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [email]
            );
            expect(afterRejectedRegistration.rows).toHaveLength(0);

            const defaultRegistration = await request(app)
                .post("/api/auth/register")
                .send({
                    fullName: "Registration Role Test",
                    email,
                    password: "TestPassword123",
                });

            expect(defaultRegistration.statusCode).toBe(201);
            expect(defaultRegistration.body.data.user.role).toBe("client");

            const createdUser = await pool.query(
                "SELECT role FROM users WHERE email = $1",
                [email]
            );
            expect(createdUser.rows).toEqual([{ role: "client" }]);
        } finally {
            await pool.query(
                "DELETE FROM users WHERE email = $1",
                [email]
            );
        }
    });

    test("POST /api/auth/login should login with valid credentials", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "client.test@example.com",
                password: "ClientPassword123",
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Login successful");

        expect(response.body.data.user).toMatchObject({
            id: 3,
            full_name: "TalentBridge Client",
            email: "client.test@example.com",
            role: "client",
        });

        expect(response.body.data.token).toEqual(
            expect.any(String)
        );
    });

    test("POST /api/auth/login should reject wrong password", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "client.test@example.com",
                password: "WrongPassword123",
            });

        expect(response.statusCode).toBe(401);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid email or password",
        });
    });

    test("POST /api/auth/login should reject unknown email", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "doesnotexist@example.com",
                password: "TestPassword123",
            });

        expect(response.statusCode).toBe(401);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid email or password",
        });
    });

    test("POST /api/auth/login should reject missing credentials", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "client.test@example.com",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Email and password are required",
        });
    });

    test("GET /api/auth/me should reject request without token", async () => {
        const response = await request(app)
            .get("/api/auth/me");

        expect(response.statusCode).toBe(401);

        expect(response.body.success).toBe(false);
    });

    test("GET /api/auth/me should reject invalid token", async () => {
        const response = await request(app)
            .get("/api/auth/me")
            .set(
                "Authorization",
                "Bearer invalid-token"
            );

        expect(response.statusCode).toBe(401);

        expect(response.body.success).toBe(false);
    });

    test("GET /api/auth/me should return current user with valid token", async () => {
        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: "client.test@example.com",
                password: "ClientPassword123",
            });

        expect(loginResponse.statusCode).toBe(200);

        const token =
            loginResponse.body.data.token;

        const response = await request(app)
            .get("/api/auth/me")
            .set(
                "Authorization",
                `Bearer ${token}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data.user).toMatchObject({
            id: 3,
            full_name: "TalentBridge Client",
            email: "client.test@example.com",
            role: "client",
        });
    });
});