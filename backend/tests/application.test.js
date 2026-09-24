const request = require("supertest");

const app = require("../src/app");
const pool = require("../src/config/db");

describe("Applications API", () => {
    let clientToken;
    let freelancerToken;
    let companyId;
    let jobId;
    let applicationId;

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

        const companyResponse = await request(app)
            .post("/api/companies")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                name: "TalentBridge Application Test Company",
                description:
                    "Company created for application API tests.",
                location: "Noida",
                industry: "Technology",
            });

        expect(companyResponse.statusCode).toBe(201);

        companyId =
            companyResponse.body.data.company.id;

        expect(companyId).toEqual(
            expect.any(String)
        );

        const jobResponse = await request(app)
            .post("/api/jobs")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                companyId: companyId,
                title: "Automated Application Test Job",
                description:
                    "Temporary job for application API testing.",
                employmentType: "full_time",
                experienceLevel: "mid",
                location: "Noida",
                isRemote: true,
                salaryMin: 50000,
                salaryMax: 80000,
                applicationDeadline:
                    "2027-12-31T23:59:59.000Z",
            });

        expect(jobResponse.statusCode).toBe(201);

        jobId =
            jobResponse.body.data.job.id;

        expect(jobId).toEqual(
            expect.any(String)
        );
    });

    afterAll(async () => {
        if (applicationId) {
            await pool.query(
                "DELETE FROM applications WHERE id = $1",
                [applicationId]
            );
        }

        if (jobId) {
            await pool.query(
                "DELETE FROM jobs WHERE id = $1",
                [jobId]
            );
        }

        if (companyId) {
            await pool.query(
                "DELETE FROM companies WHERE id = $1",
                [companyId]
            );
        }
    });

    test("POST application should reject request without token", async () => {
        const response = await request(app)
            .post(
                `/api/jobs/${jobId}/applications`
            )
            .send({
                coverLetter:
                    "Test cover letter",
            });

        expect(response.statusCode).toBe(401);

        expect(response.body).toEqual({
            success: false,
            message: "Authentication required",
        });
    });

    test("POST application should reject client user", async () => {
        const response = await request(app)
            .post(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                coverLetter:
                    "I want to apply for this job.",
            });

        expect(response.statusCode).toBe(403);

        expect(response.body).toEqual({
            success: false,
            message:
                "You do not have permission to perform this action",
        });
    });

    test("POST application should reject invalid job ID", async () => {
        const response = await request(app)
            .post(
                "/api/jobs/invalid-job-id/applications"
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "Test cover letter",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid job ID",
        });
    });

    test("POST application should reject zero job ID", async () => {
        const response = await request(app)
            .post(
                "/api/jobs/0/applications"
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "Test cover letter",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid job ID",
        });
    });

    test("POST application should reject missing cover letter", async () => {
        const response = await request(app)
            .post(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                resumeUrl:
                    "https://example.com/resume.pdf",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Cover letter is required",
        });
    });

    test("POST application should reject non-string cover letter", async () => {
        const response = await request(app)
            .post(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter: 12345,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Cover letter is required",
        });
    });

    test("POST application should reject cover letter longer than 5000 characters", async () => {
        const longCoverLetter =
            "A".repeat(5001);

        const response = await request(app)
            .post(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter: longCoverLetter,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "Cover letter must not exceed 5000 characters",
        });
    });

    test("POST application should reject invalid resume URL", async () => {
        const response = await request(app)
            .post(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "I am interested in this position.",
                resumeUrl:
                    "not-a-valid-url",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "Resume URL must be a valid URL",
        });
    });

    test("POST application should reject non-string resume URL", async () => {
        const response = await request(app)
            .post(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "I am interested in this position.",
                resumeUrl: 12345,
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message:
                "Resume URL must be a valid URL",
        });
    });

    test("POST application should create an application", async () => {
        const response = await request(app)
            .post(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "I am interested in this position and have experience with Node.js, Express.js, PostgreSQL, and React.",
                resumeUrl:
                    "https://example.com/resume.pdf",
            });

        expect(response.statusCode).toBe(201);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Application submitted successfully"
        );

        expect(
            response.body.data.application
        ).toMatchObject({
            job_id: jobId,
            applicant_id: 2,
            status: "pending",
            cover_letter:
                "I am interested in this position and have experience with Node.js, Express.js, PostgreSQL, and React.",
            resume_url:
                "https://example.com/resume.pdf",
        });

        applicationId =
            response.body.data.application.id;

        expect(applicationId).toEqual(
            expect.any(String)
        );
    });

    test("POST application should reject duplicate application", async () => {
        const response = await request(app)
            .post(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            )
            .send({
                coverLetter:
                    "Another application attempt",
            });

        expect(response.statusCode).toBe(409);

        expect(response.body).toEqual({
            success: false,
            message:
                "You have already applied to this job",
        });
    });

    test("GET my applications should return freelancer applications", async () => {
        const response = await request(app)
            .get("/api/applications/me")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(
                response.body.data.applications
            )
        ).toBe(true);

        const application =
            response.body.data.applications.find(
                (item) =>
                    item.id === applicationId
            );

        expect(application).toBeDefined();

        expect(application).toMatchObject({
            job_id: jobId,
            job_title:
                "Automated Application Test Job",
            status: "pending",
            company_id: companyId,
        });
    });

    test("GET job applications should allow job owner to view applications", async () => {
        const response = await request(app)
            .get(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            Array.isArray(
                response.body.data.applications
            )
        ).toBe(true);

        const application =
            response.body.data.applications.find(
                (item) =>
                    item.id === applicationId
            );

        expect(application).toBeDefined();

        expect(application).toMatchObject({
            job_id: jobId,
            applicant_id: 2,
            applicant_name: "Himanshu Test",
            applicant_email:
                "himanshu.test@example.com",
            status: "pending",
        });
    });

    test("GET job applications should reject invalid job ID", async () => {
        const response = await request(app)
            .get(
                "/api/jobs/invalid-job-id/applications"
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid job ID",
        });
    });

    test("GET job applications should reject unauthorized freelancer", async () => {
        const response = await request(app)
            .get(
                `/api/jobs/${jobId}/applications`
            )
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(403);

        expect(response.body.success).toBe(false);
    });

    test("PATCH application status should reject invalid job ID", async () => {
        const response = await request(app)
            .patch(
                `/api/jobs/invalid-job-id/applications/${applicationId}`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                status: "shortlisted",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid job ID",
        });
    });

    test("PATCH application status should reject invalid application ID", async () => {
        const response = await request(app)
            .patch(
                `/api/jobs/${jobId}/applications/invalid-application-id`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                status: "shortlisted",
            });

        expect(response.statusCode).toBe(400);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid application ID",
        });
    });

    test("PATCH application status should reject invalid status", async () => {
        const response = await request(app)
            .patch(
                `/api/jobs/${jobId}/applications/${applicationId}`
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
            message: "Invalid application status",
        });
    });

    test("PATCH application status should update application", async () => {
        const response = await request(app)
            .patch(
                `/api/jobs/${jobId}/applications/${applicationId}`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                status: "shortlisted",
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Application status updated successfully"
        );

        expect(
            response.body.data.application
        ).toMatchObject({
            id: applicationId,
            job_id: jobId,
            applicant_id: 2,
            status: "shortlisted",
        });
    });

    test("PATCH application status should reject unauthorized freelancer", async () => {
        const response = await request(app)
            .patch(
                `/api/jobs/${jobId}/applications/${applicationId}`
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

    test("PATCH application status should return current application when status is unchanged", async () => {
        const response = await request(app)
            .patch(
                `/api/jobs/${jobId}/applications/${applicationId}`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            )
            .send({
                status: "shortlisted",
            });

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Application status is already set to this value"
        );

        expect(
            response.body.data.application
        ).toMatchObject({
            id: applicationId,
            status: "shortlisted",
        });
    });
});