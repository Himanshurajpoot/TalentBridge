const request = require("supertest");
const fs = require("fs/promises");
const path = require("path");

const app = require("../src/app");

const pool = require("../src/config/db");
const profilePhotoDirectory = path.resolve(
    __dirname,
    "../uploads/profile-photos"
);
const uploadedPhotoUrls = [];

const createPngBuffer = () =>
    Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l3sAAAAASUVORK5CYII=",
        "base64"
    );

const trackPhoto = (photoUrl) => {
    uploadedPhotoUrls.push(photoUrl);
    return photoUrl;
};

describe("Profile API", () => {
    let clientToken;
    let freelancerToken;
    let photoOwnerId;

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
        photoOwnerId = Number(
            freelancerLogin.body.data.user.id
        );
    });

    beforeEach(async () => {
        await pool.query(
            `
            DELETE FROM profiles
            WHERE user_id IN (2, 3)
            `
        );
    });

    afterEach(async () => {
        await Promise.all(
            uploadedPhotoUrls.map((photoUrl) =>
                fs.rm(
                    path.join(
                        profilePhotoDirectory,
                        path.basename(photoUrl)
                    ),
                    { force: true }
                )
            )
        );
        uploadedPhotoUrls.length = 0;
    });

    test("POST /api/profile/me/photo - should upload a valid PNG", async () => {
        const response = await request(app)
            .post("/api/profile/me/photo")
            .set("Authorization", `Bearer ${freelancerToken}`)
            .attach("photo", createPngBuffer(), {
                filename: "profile.png",
                contentType: "image/png",
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        const photoUrl = trackPhoto(
            response.body.data.profile.avatar_url
        );
        expect(photoUrl).toMatch(
            /^\/uploads\/profile-photos\/[0-9a-f-]+\.png$/
        );

        const profile = await pool.query(
            "SELECT avatar_url FROM profiles WHERE user_id = $1",
            [photoOwnerId]
        );
        expect(profile.rows[0].avatar_url).toBe(photoUrl);

        const storedFile = await fs.readFile(
            path.join(
                profilePhotoDirectory,
                path.basename(photoUrl)
            )
        );
        expect(storedFile.subarray(0, 8)).toEqual(
            createPngBuffer().subarray(0, 8)
        );

        const imageResponse = await request(app).get(photoUrl);
        expect(imageResponse.statusCode).toBe(200);
        expect(imageResponse.headers["content-type"]).toMatch(
            /^image\/png/
        );
        expect(
            imageResponse.headers["x-content-type-options"]
        ).toBe("nosniff");

        const profileUpdate = await request(app)
            .put("/api/profile/me")
            .set("Authorization", `Bearer ${freelancerToken}`)
            .send({ bio: "Photo should remain unchanged" });
        expect(profileUpdate.statusCode).toBe(200);
        expect(profileUpdate.body.data.profile.avatar_url).toBe(
            photoUrl
        );
    });

    test("POST /api/profile/me/photo - should reject unauthenticated uploads", async () => {
        const response = await request(app)
            .post("/api/profile/me/photo")
            .attach("photo", createPngBuffer(), {
                filename: "profile.png",
                contentType: "image/png",
            });

        expect(response.statusCode).toBe(401);
    });

    test("POST /api/profile/me/photo - should reject unsupported file types", async () => {
        const response = await request(app)
            .post("/api/profile/me/photo")
            .set("Authorization", `Bearer ${freelancerToken}`)
            .attach("photo", Buffer.from("GIF89a"), {
                filename: "profile.gif",
                contentType: "image/gif",
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toMatch(
            /JPEG, PNG, and WebP/
        );
    });

    test("POST /api/profile/me/photo - should reject content that does not match its image type", async () => {
        const response = await request(app)
            .post("/api/profile/me/photo")
            .set("Authorization", `Bearer ${freelancerToken}`)
            .attach("photo", Buffer.from("GIF89a"), {
                filename: "profile.png",
                contentType: "image/png",
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toMatch(
            /does not match/
        );
    });

    test("POST /api/profile/me/photo - should reject files larger than 5 MB", async () => {
        const response = await request(app)
            .post("/api/profile/me/photo")
            .set("Authorization", `Bearer ${freelancerToken}`)
            .attach(
                "photo",
                Buffer.alloc(5 * 1024 * 1024 + 1),
                {
                    filename: "large.png",
                    contentType: "image/png",
                }
            );

        expect(response.statusCode).toBe(413);
    });

    test("POST /api/profile/me/photo - should not allow changing another user's photo", async () => {
        const existingPhotoUrl =
            "https://example.com/other-user-photo.png";
        const otherUserId = photoOwnerId === 2 ? 3 : 2;

        await pool.query(
            `INSERT INTO profiles (user_id, avatar_url)
             VALUES ($1, $2)
             ON CONFLICT (user_id)
             DO UPDATE SET avatar_url = EXCLUDED.avatar_url`,
            [otherUserId, existingPhotoUrl]
        );

        try {
            const targetedResponse = await request(app)
                .post(`/api/profile/${otherUserId}/photo`)
                .set(
                    "Authorization",
                    `Bearer ${freelancerToken}`
                )
                .attach("photo", createPngBuffer(), {
                    filename: "profile.png",
                    contentType: "image/png",
                });
            expect(targetedResponse.statusCode).toBe(404);

            const forgedOwnerResponse = await request(app)
                .post("/api/profile/me/photo")
                .set(
                    "Authorization",
                    `Bearer ${freelancerToken}`
                )
                .field("userId", String(otherUserId))
                .attach("photo", createPngBuffer(), {
                    filename: "profile.png",
                    contentType: "image/png",
                });
            expect(forgedOwnerResponse.statusCode).toBe(400);

            const profile = await pool.query(
                "SELECT avatar_url FROM profiles WHERE user_id = $1",
                [otherUserId]
            );
            expect(profile.rows[0].avatar_url).toBe(
                existingPhotoUrl
            );
        } finally {
            await pool.query(
                "DELETE FROM profiles WHERE user_id = $1",
                [otherUserId]
            );
        }
    });

    test("DELETE /api/profile/me/photo - should remove the photo and stored file", async () => {
        const uploadResponse = await request(app)
            .post("/api/profile/me/photo")
            .set("Authorization", `Bearer ${freelancerToken}`)
            .attach("photo", createPngBuffer(), {
                filename: "profile.png",
                contentType: "image/png",
            });

        expect(uploadResponse.statusCode).toBe(200);
        const photoUrl = trackPhoto(
            uploadResponse.body.data.profile.avatar_url
        );
        const filePath = path.join(
            profilePhotoDirectory,
            path.basename(photoUrl)
        );

        const response = await request(app)
            .delete("/api/profile/me/photo")
            .set("Authorization", `Bearer ${freelancerToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.data.profile.avatar_url).toBeNull();
        await expect(fs.access(filePath)).rejects.toMatchObject({
            code: "ENOENT",
        });

        const profile = await pool.query(
            "SELECT avatar_url FROM profiles WHERE user_id = $1",
            [photoOwnerId]
        );
        expect(profile.rows[0].avatar_url).toBeNull();
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