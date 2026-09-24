const request = require("supertest");

const app = require("../src/app");

const pool = require("../src/config/db");

describe("Notification API", () => {
    let clientToken;
    let freelancerToken;
    let notificationId;

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
            DELETE FROM notifications
            WHERE user_id IN (2, 3)
            `
        );

        notificationId = null;
    });

    test("GET /api/notifications - should reject request without token", async () => {
        const response = await request(app)
            .get("/api/notifications");

        expect(response.statusCode).toBe(401);
    });

    test("GET /api/notifications - should return empty notifications", async () => {
        const response = await request(app)
            .get("/api/notifications")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.data).toBeDefined();

        expect(
            Array.isArray(
                response.body.data.notifications
            )
        ).toBe(true);

        expect(
            response.body.data.notifications.length
        ).toBe(0);
    });

    test("GET /api/notifications - should return user notifications", async () => {
        await pool.query(
            `
            INSERT INTO notifications
                (
                    user_id,
                    type,
                    title,
                    message,
                    reference_type,
                    reference_id
                )
            VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )
            `,
            [
                3,
                "test_notification",
                "Test Notification",
                "This is a test notification",
                "test",
                100,
            ]
        );

        const response = await request(app)
            .get("/api/notifications")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            response.body.data.notifications.length
        ).toBe(1);

        expect(
            response.body.data.notifications[0].title
        ).toBe("Test Notification");

        expect(
            response.body.data.notifications[0].message
        ).toBe("This is a test notification");

        expect(
            response.body.data.notifications[0].is_read
        ).toBe(false);
    });

    test("GET /api/notifications - should only return notifications for logged-in user", async () => {
        await pool.query(
            `
            INSERT INTO notifications
                (
                    user_id,
                    type,
                    title,
                    message
                )
            VALUES
                ($1, $2, $3, $4),
                ($5, $6, $7, $8)
            `,
            [
                3,
                "client_notification",
                "Client Notification",
                "For client",
                2,
                "freelancer_notification",
                "Freelancer Notification",
                "For freelancer",
            ]
        );

        const response = await request(app)
            .get("/api/notifications")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(
            response.body.data.notifications.length
        ).toBe(1);

        expect(
            response.body.data.notifications[0].title
        ).toBe("Client Notification");
    });

    test("PATCH /api/notifications/:id/read - should reject request without token", async () => {
        const response = await request(app)
            .patch("/api/notifications/1/read");

        expect(response.statusCode).toBe(401);
    });

    test("PATCH /api/notifications/:id/read - should return 404 for non-existent notification", async () => {
        const response = await request(app)
            .patch("/api/notifications/999999/read")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            "Notification not found"
        );
    });

    test("PATCH /api/notifications/:id/read - should not allow reading another user's notification", async () => {
        const result = await pool.query(
            `
            INSERT INTO notifications
                (
                    user_id,
                    type,
                    title,
                    message
                )
            VALUES
                ($1, $2, $3, $4)
            RETURNING id
            `,
            [
                2,
                "test_notification",
                "Freelancer Notification",
                "Private notification",
            ]
        );

        notificationId = result.rows[0].id;

        const response = await request(app)
            .patch(
                `/api/notifications/${notificationId}/read`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(404);

        expect(response.body.message).toBe(
            "Notification not found"
        );
    });

    test("PATCH /api/notifications/:id/read - should mark notification as read", async () => {
        const result = await pool.query(
            `
            INSERT INTO notifications
                (
                    user_id,
                    type,
                    title,
                    message
                )
            VALUES
                ($1, $2, $3, $4)
            RETURNING id
            `,
            [
                3,
                "test_notification",
                "Test Notification",
                "Read this notification",
            ]
        );

        notificationId = result.rows[0].id;

        const response = await request(app)
            .patch(
                `/api/notifications/${notificationId}/read`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Notification marked as read"
        );

        expect(response.body.data).toBeDefined();

        expect(
            response.body.data.notification
        ).toBeDefined();

        expect(
            response.body.data.notification.id
        ).toBe(notificationId);

        expect(
            response.body.data.notification.is_read
        ).toBe(true);
    });

    test("PATCH /api/notifications/:id/read - should remain successful if already read", async () => {
        const result = await pool.query(
            `
            INSERT INTO notifications
                (
                    user_id,
                    type,
                    title,
                    message,
                    is_read
                )
            VALUES
                ($1, $2, $3, $4, true)
            RETURNING id
            `,
            [
                3,
                "test_notification",
                "Already Read",
                "This notification is already read",
            ]
        );

        notificationId = result.rows[0].id;

        const response = await request(app)
            .patch(
                `/api/notifications/${notificationId}/read`
            )
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(
            response.body.data.notification.is_read
        ).toBe(true);
    });

    test("PATCH /api/notifications/read-all - should reject request without token", async () => {
        const response = await request(app)
            .patch("/api/notifications/read-all");

        expect(response.statusCode).toBe(401);
    });

    test("PATCH /api/notifications/read-all - should mark all unread notifications as read", async () => {
        await pool.query(
            `
            INSERT INTO notifications
                (
                    user_id,
                    type,
                    title,
                    message,
                    is_read
                )
            VALUES
                ($1, $2, $3, $4, false),
                ($1, $5, $6, $7, false),
                ($1, $8, $9, $10, true)
            `,
            [
                3,
                "notification_one",
                "Notification One",
                "First notification",
                "notification_two",
                "Notification Two",
                "Second notification",
                "notification_three",
                "Notification Three",
                "Already read",
            ]
        );

        const response = await request(app)
            .patch("/api/notifications/read-all")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "All notifications marked as read"
        );

        expect(response.body.data).toBeDefined();

        expect(
            response.body.data.updatedCount
        ).toBe(2);

        const result = await pool.query(
            `
            SELECT is_read
            FROM notifications
            WHERE user_id = $1
            `,
            [3]
        );

        expect(result.rows.length).toBe(3);

        expect(
            result.rows.every(
                (notification) => notification.is_read === true
            )
        ).toBe(true);
    });

    test("PATCH /api/notifications/read-all - should only update logged-in user's notifications", async () => {
        await pool.query(
            `
            INSERT INTO notifications
                (
                    user_id,
                    type,
                    title,
                    message,
                    is_read
                )
            VALUES
                ($1, $2, $3, $4, false),
                ($5, $6, $7, $8, false)
            `,
            [
                3,
                "client_notification",
                "Client Notification",
                "Client unread notification",
                2,
                "freelancer_notification",
                "Freelancer Notification",
                "Freelancer unread notification",
            ]
        );

        const response = await request(app)
            .patch("/api/notifications/read-all")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(
            response.body.data.updatedCount
        ).toBe(1);

        const result = await pool.query(
            `
            SELECT user_id, is_read
            FROM notifications
            WHERE user_id IN ($1, $2)
            ORDER BY user_id
            `,
            [2, 3]
        );

        expect(result.rows.length).toBe(2);

        const freelancerNotification =
            result.rows.find(
                (notification) =>
                    Number(notification.user_id) === 2
            );

        const clientNotification =
            result.rows.find(
                (notification) =>
                    Number(notification.user_id) === 3
            );

        expect(
            freelancerNotification.is_read
        ).toBe(false);

        expect(
            clientNotification.is_read
        ).toBe(true);
    });

    test("GET /api/notifications - should return notifications ordered by newest first", async () => {
        await pool.query(
            `
            INSERT INTO notifications
                (
                    user_id,
                    type,
                    title,
                    message
                )
            VALUES
                ($1, $2, $3, $4),
                ($1, $5, $6, $7)
            `,
            [
                3,
                "older_notification",
                "Older Notification",
                "Older message",
                "newer_notification",
                "Newer Notification",
                "Newer message",
            ]
        );

        const response = await request(app)
            .get("/api/notifications")
            .set(
                "Authorization",
                `Bearer ${clientToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(
            response.body.data.notifications.length
        ).toBe(2);

        expect(
            response.body.data.notifications[0].created_at
        ).toBeDefined();

        expect(
            new Date(
                response.body.data.notifications[0].created_at
            ).getTime()
        ).toBeGreaterThanOrEqual(
            new Date(
                response.body.data.notifications[1].created_at
            ).getTime()
        );
    });

    test("GET /api/notifications - freelancer should get their notifications", async () => {
        await pool.query(
            `
            INSERT INTO notifications
                (
                    user_id,
                    type,
                    title,
                    message
                )
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                2,
                "freelancer_notification",
                "Freelancer Notification",
                "Notification for freelancer",
            ]
        );

        const response = await request(app)
            .get("/api/notifications")
            .set(
                "Authorization",
                `Bearer ${freelancerToken}`
            );

        expect(response.statusCode).toBe(200);

        expect(
            response.body.data.notifications.length
        ).toBe(1);

        expect(
            response.body.data.notifications[0].title
        ).toBe("Freelancer Notification");
    });
});