const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

describe("Company API", () => {
    let clientToken;
    let freelancerToken;
    let adminToken;

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
                email: "freelancer2.test@example.com",
                password: "TestPassword456",
            });

        expect(freelancerLogin.statusCode).toBe(200);
        freelancerToken = freelancerLogin.body.data.token;

        const adminResult = await pool.query(
            "SELECT id, email FROM users WHERE role = 'admin' LIMIT 1"
        );

        if (adminResult.rows.length > 0) {
            const adminEmail = adminResult.rows[0].email;

            const adminLogin = await request(app)
                .post("/api/auth/login")
                .send({
                    email: adminEmail,
                    password: "AdminPassword123",
                });

            if (adminLogin.statusCode === 200) {
                adminToken = adminLogin.body.data.token;
            }
        }
    });

    beforeEach(async () => {
        await pool.query(
            `
            DELETE FROM companies
            WHERE name LIKE 'TalentBridge Company Test%'
               OR name IN ('Older Company', 'Newer Company', 'Company One', 'Company Two')
            `
        );
    });

    describe("POST /api/companies", () => {
        test("should reject request without token", async () => {
            const response = await request(app)
                .post("/api/companies")
                .send({
                    name: "TalentBridge Company Test Unauthorized",
                });

            expect(response.statusCode).toBe(401);
        });

        test("should reject freelancer role", async () => {
            const response = await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${freelancerToken}`)
                .send({
                    name: "TalentBridge Company Test Freelancer",
                });

            expect(response.statusCode).toBe(403);
        });

        test("should reject missing company name", async () => {
            const response = await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    description: "Test company description",
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe(
                "Company name is required"
            );
        });

        test("should reject empty company name", async () => {
            const response = await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "   ",
                });

            expect(response.statusCode).toBe(400);
            expect(response.body.message).toBe(
                "Company name is required"
            );
        });

        test("should create company", async () => {
            const response = await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "TalentBridge Company Test Create",
                    description: "Test company description",
                    websiteUrl: "https://example.com",
                    logoUrl: "https://example.com/logo.png",
                    location: "Delhi",
                    industry: "Technology",
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(
                "Company created successfully"
            );

            expect(response.body.data.company).toBeDefined();
            expect(response.body.data.company.name).toBe(
                "TalentBridge Company Test Create"
            );
        });

        test("should trim company fields", async () => {
            const response = await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "  TalentBridge Company Test Trimmed  ",
                    description: "  Company description  ",
                    websiteUrl: "  https://example.com  ",
                    logoUrl: "  https://example.com/logo.png  ",
                    location: "  Noida  ",
                    industry: "  Technology  ",
                });

            expect(response.statusCode).toBe(201);

            const company = response.body.data.company;

            expect(company.name).toBe(
                "TalentBridge Company Test Trimmed"
            );
            expect(company.description).toBe(
                "Company description"
            );
            expect(company.website_url).toBe(
                "https://example.com"
            );
            expect(company.logo_url).toBe(
                "https://example.com/logo.png"
            );
            expect(company.location).toBe("Noida");
            expect(company.industry).toBe("Technology");
        });

        test("should allow optional fields to be omitted", async () => {
            const response = await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "TalentBridge Company Test Minimal",
                });

            expect(response.statusCode).toBe(201);

            const company = response.body.data.company;

            expect(company.name).toBe(
                "TalentBridge Company Test Minimal"
            );
            expect(company.description).toBeNull();
            expect(company.website_url).toBeNull();
            expect(company.logo_url).toBeNull();
            expect(company.location).toBeNull();
            expect(company.industry).toBeNull();
        });

        test("should create company for admin when admin credentials are available", async () => {
            if (!adminToken) {
                return;
            }

            const response = await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "TalentBridge Company Test Admin",
                });

            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
        });
    });

    describe("GET /api/companies", () => {
        test("should reject request without token", async () => {
            const response = await request(app)
                .get("/api/companies");

            expect(response.statusCode).toBe(401);
        });

        test("should reject freelancer role", async () => {
            const response = await request(app)
                .get("/api/companies")
                .set("Authorization", `Bearer ${freelancerToken}`);

            expect(response.statusCode).toBe(403);
        });

        test("should return empty companies for client with no test companies", async () => {
            const response = await request(app)
                .get("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.companies).toEqual([]);
        });

        test("should return logged-in user's test companies", async () => {
            await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "TalentBridge Company Test One",
                });

            await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "TalentBridge Company Test Two",
                });

            const response = await request(app)
                .get("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.companies).toHaveLength(2);

            const names = response.body.data.companies.map(
                (company) => company.name
            );

            expect(names).toContain(
                "TalentBridge Company Test One"
            );
            expect(names).toContain(
                "TalentBridge Company Test Two"
            );
        });

        test("should not return another user's companies", async () => {
            const clientCompany = await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "TalentBridge Company Test Client",
                });

            expect(clientCompany.statusCode).toBe(201);

            const response = await request(app)
                .get("/api/companies")
                .set("Authorization", `Bearer ${freelancerToken}`);

            expect(response.statusCode).toBe(403);
        });

        test("should return companies ordered by created_at descending", async () => {
            await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "TalentBridge Company Test Older",
                });

            await new Promise((resolve) =>
                setTimeout(resolve, 20)
            );

            await request(app)
                .post("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`)
                .send({
                    name: "TalentBridge Company Test Newer",
                });

            const response = await request(app)
                .get("/api/companies")
                .set("Authorization", `Bearer ${clientToken}`);

            expect(response.statusCode).toBe(200);

            const companies =
                response.body.data.companies;

            expect(companies[0].name).toBe(
                "TalentBridge Company Test Newer"
            );
            expect(companies[1].name).toBe(
                "TalentBridge Company Test Older"
            );
        });
    });
});