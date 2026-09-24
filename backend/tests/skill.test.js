const request = require("supertest");

const app = require("../src/app");

const pool = require("../src/config/db");

describe("Skill API", () => {
    let clientToken;
    let freelancerToken;
    let skillId;

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
            DELETE FROM user_skills
            WHERE user_id IN (2, 3)
            `
        );

        await pool.query(
            `
            DELETE FROM skills
            WHERE name LIKE 'TalentBridge Test Skill%'
            `
        );

        skillId = null;
    });

    test("GET /api/skills - should return skills", async () => {
        const response = await request(app)
            .get("/api/skills");

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data).toBeDefined();

        expect(
            Array.isArray(response.body.data.skills)
        ).toBe(true);
    });

    test("POST /api/skills - should reject missing skill name", async () => {
        const response = await request(app)
            .post("/api/skills")
            .send({});

        expect(response.statusCode).toBe(400);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "Skill name is required"
        );
    });

    test("POST /api/skills - should reject empty skill name", async () => {
        const response = await request(app)
            .post("/api/skills")
            .send({
                name: "   ",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.message).toBe(
            "Skill name is required"
        );
    });

    test("POST /api/skills - should create skill", async () => {
        const response = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Java",
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Skill created successfully"
        );

        expect(response.body.data).toBeDefined();

        expect(
            response.body.data.skill
        ).toBeDefined();

        expect(
            response.body.data.skill.name
        ).toBe("TalentBridge Test Skill Java");

        skillId = response.body.data.skill.id;
    });

    test("POST /api/skills - should trim skill name", async () => {
        const response = await request(app)
            .post("/api/skills")
            .send({
                name: "   TalentBridge Test Skill React   ",
            });

        expect(response.statusCode).toBe(201);

        expect(
            response.body.data.skill.name
        ).toBe("TalentBridge Test Skill React");

        skillId = response.body.data.skill.id;
    });

    test("POST /api/skills - should reject duplicate skill", async () => {
        const firstResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Duplicate",
            });

        expect(firstResponse.statusCode).toBe(201);

        skillId = firstResponse.body.data.skill.id;

        const secondResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Duplicate",
            });

        expect(secondResponse.statusCode).toBe(409);

        expect(secondResponse.body.success).toBe(false);

        expect(secondResponse.body.message).toBe(
            "Skill already exists"
        );
    });

    test("POST /api/skills/profile/me - should reject request without token", async () => {
        const response = await request(app)
            .post("/api/skills/profile/me")
            .send({
                skillId: 1,
            });

        expect(response.statusCode).toBe(401);
    });

    test("POST /api/skills/profile/me - should reject missing skillId", async () => {
        const response = await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({});

        expect(response.statusCode).toBe(400);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "skillId is required"
        );
    });

    test("POST /api/skills/profile/me - should reject invalid proficiency", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Invalid Proficiency",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        const response = await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                skillId,
                proficiency: "master",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "Invalid proficiency level"
        );
    });

    test("POST /api/skills/profile/me - should return 404 for non-existent skill", async () => {
        const response = await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                skillId: 999999,
            });

        expect(response.statusCode).toBe(404);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "Skill not found"
        );
    });

    test("POST /api/skills/profile/me - should add skill to profile", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Node",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        const response = await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                skillId,
                proficiency: "advanced",
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Skill added to profile"
        );

        expect(response.body.data).toBeDefined();

        expect(
            response.body.data.userSkill
        ).toBeDefined();

        expect(
            response.body.data.skill
        ).toBeDefined();

        expect(
            response.body.data.skill.name
        ).toBe("TalentBridge Test Skill Node");

        expect(
            response.body.data.userSkill.proficiency
        ).toBe("advanced");
    });

    test("POST /api/skills/profile/me - should allow skill without proficiency", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill SQL",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        const response = await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                skillId,
            });

        expect(response.statusCode).toBe(201);

        expect(
            response.body.data.userSkill.proficiency
        ).toBeNull();
    });

    test("POST /api/skills/profile/me - should reject duplicate profile skill", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Duplicate Profile",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        const firstResponse = await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                skillId,
                proficiency: "beginner",
            });

        expect(firstResponse.statusCode).toBe(201);

        const secondResponse = await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                skillId,
                proficiency: "advanced",
            });

        expect(secondResponse.statusCode).toBe(409);

        expect(secondResponse.body.success).toBe(false);

        expect(secondResponse.body.message).toBe(
            "Skill already added to your profile"
        );
    });

    test("GET /api/profile/me/skills - should reject request without token", async () => {
        const response = await request(app)
            .get("/api/profile/me/skills");

        expect(response.statusCode).toBe(401);
    });

    test("GET /api/profile/me/skills - should return empty skills initially", async () => {
        const response = await request(app)
            .get("/api/profile/me/skills")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data).toBeDefined();

        expect(
            Array.isArray(response.body.data.skills)
        ).toBe(true);

        expect(
            response.body.data.skills.length
        ).toBe(0);
    });

    test("GET /api/profile/me/skills - should return user's skills", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill MongoDB",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                skillId,
                proficiency: "expert",
            });

        const response = await request(app)
            .get("/api/profile/me/skills")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(
            response.body.data.skills.length
        ).toBe(1);

        expect(
            response.body.data.skills[0].name
        ).toBe("TalentBridge Test Skill MongoDB");

        expect(
            response.body.data.skills[0].proficiency
        ).toBe("expert");
    });

    test("GET /api/profile/me/skills - should only return logged-in user's skills", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Isolation",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                skillId,
                proficiency: "beginner",
            });

        const freelancerResponse = await request(app)
            .get("/api/profile/me/skills")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(freelancerResponse.statusCode).toBe(200);

        expect(
            freelancerResponse.body.data.skills.length
        ).toBe(0);
    });

    test("PATCH /api/profile/me/skills/:skillId - should reject request without token", async () => {
        const response = await request(app)
            .patch("/api/profile/me/skills/1")
            .send({
                proficiency: "expert",
            });

        expect(response.statusCode).toBe(401);
    });

    test("PATCH /api/profile/me/skills/:skillId - should reject missing proficiency", async () => {
        const response = await request(app)
            .patch("/api/profile/me/skills/1")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({});

        expect(response.statusCode).toBe(400);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "proficiency is required"
        );
    });

    test("PATCH /api/profile/me/skills/:skillId - should reject invalid proficiency", async () => {
        const response = await request(app)
            .patch("/api/profile/me/skills/1")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                proficiency: "master",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "Invalid proficiency level"
        );
    });

    test("PATCH /api/profile/me/skills/:skillId - should return 404 when skill is not in profile", async () => {
        const response = await request(app)
            .patch("/api/profile/me/skills/999999")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                proficiency: "expert",
            });

        expect(response.statusCode).toBe(404);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "Skill not found in your profile"
        );
    });

    test("PATCH /api/profile/me/skills/:skillId - should update proficiency", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Update",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                skillId,
                proficiency: "beginner",
            });

        const response = await request(app)
            .patch(
                `/api/profile/me/skills/${skillId}`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                proficiency: "expert",
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Skill proficiency updated successfully"
        );

        expect(
            response.body.data.userSkill.proficiency
        ).toBe("expert");

        expect(
            response.body.data.skill.name
        ).toBe("TalentBridge Test Skill Update");
    });

    test("PATCH /api/profile/me/skills/:skillId - should not update another user's skill", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Ownership",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                skillId,
                proficiency: "beginner",
            });

        const response = await request(app)
            .patch(
                `/api/profile/me/skills/${skillId}`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                proficiency: "expert",
            });

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            "Skill not found in your profile"
        );
    });

    test("DELETE /api/profile/me/skills/:skillId - should reject request without token", async () => {
        const response = await request(app)
            .delete("/api/profile/me/skills/1");

        expect(response.statusCode).toBe(401);
    });

    test("DELETE /api/profile/me/skills/:skillId - should return 404 when skill is not in profile", async () => {
        const response = await request(app)
            .delete("/api/profile/me/skills/999999")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            "Skill not found in your profile"
        );
    });

    test("DELETE /api/profile/me/skills/:skillId - should remove skill", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Remove",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                skillId,
                proficiency: "intermediate",
            });

        const response = await request(app)
            .delete(
                `/api/profile/me/skills/${skillId}`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Skill removed from profile"
        );

        const skillsResponse = await request(app)
            .get("/api/profile/me/skills")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(
            skillsResponse.body.data.skills.length
        ).toBe(0);
    });

    test("DELETE /api/profile/me/skills/:skillId - should not remove another user's skill", async () => {
        const skillResponse = await request(app)
            .post("/api/skills")
            .send({
                name: "TalentBridge Test Skill Delete Ownership",
            });

        expect(skillResponse.statusCode).toBe(201);

        skillId = skillResponse.body.data.skill.id;

        await request(app)
            .post("/api/skills/profile/me")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                skillId,
                proficiency: "advanced",
            });

        const response = await request(app)
            .delete(
                `/api/profile/me/skills/${skillId}`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            "Skill not found in your profile"
        );
    });
});