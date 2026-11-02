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

    test("malformed JSON errors do not log the rejected request body", async () => {
        const sensitiveValue = "sensitive-password-value";
        const errorLogger = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const response = await request(app)
                .post("/api/health")
                .set("Content-Type", "application/json")
                .send(`{"password":"${sensitiveValue}", invalid}`);

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual({
                success: false,
                message: "Invalid JSON",
            });
            expect(errorLogger).toHaveBeenCalledWith(
                "Malformed JSON request",
                { method: "POST", path: "/api/health" },
            );
            expect(JSON.stringify(errorLogger.mock.calls))
                .not.toContain(sensitiveValue);
        } finally {
            errorLogger.mockRestore();
        }
    });
});