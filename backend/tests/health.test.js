const request = require("supertest");
const app = require("../src/app");

describe("Health API", () => {
    test("GET /api/health should return 200", async () => {
        const response = await request(app)
            .get("/api/health");

        expect(response.statusCode).toBe(200);

        expect(response.body).toEqual({
            success: true,
            message: "TalentBridge API is running",
        });
    });

    test("GET unknown route should return 404", async () => {
        const response = await request(app)
            .get("/api/this-route-does-not-exist");

        expect(response.statusCode).toBe(404);

        expect(response.body).toEqual({
            success: false,
            message: "Route not found",
        });
    });
});