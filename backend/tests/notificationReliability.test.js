jest.mock("../src/config/db", () => ({
    query: jest.fn(),
}));

const pool = require("../src/config/db");
const {
    createNotification,
    setSocketIO,
} = require("../src/services/notificationService");
const {
    createApplication,
} = require("../src/controllers/applicationController");

const notification = {
    id: "91",
    user_id: 3,
    type: "application_submitted",
    title: "New Application",
    message: 'A freelancer applied for "Backend Developer".',
    reference_type: "job",
    reference_id: "7",
};

const createResponse = () => ({
    statusCode: null,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

const invokeCreateApplication = async () => {
    const req = {
        params: { jobId: "7" },
        body: {
            coverLetter: "I would like to apply.",
        },
        user: { id: 9 },
    };
    const res = createResponse();
    await createApplication(req, res);
    return res;
};

const mockApplicationQueries = ({ notificationError } = {}) => {
    pool.query.mockImplementation(async (sql) => {
        if (sql.includes("FROM jobs")) {
            return {
                rowCount: 1,
                rows: [{
                    id: "7",
                    posted_by: 3,
                    title: "Backend Developer",
                    status: "open",
                    application_deadline: null,
                }],
            };
        }

        if (sql.includes("FROM applications")) {
            return { rowCount: 0, rows: [] };
        }

        if (sql.includes("INSERT INTO applications")) {
            return {
                rowCount: 1,
                rows: [{
                    id: "51",
                    job_id: "7",
                    applicant_id: 9,
                    status: "pending",
                }],
            };
        }

        if (sql.includes("FROM users")) {
            return {
                rowCount: 1,
                rows: [{ full_name: "Freelancer" }],
            };
        }

        if (sql.includes("INSERT INTO notifications")) {
            if (notificationError) {
                throw notificationError;
            }
            return { rowCount: 1, rows: [notification] };
        }

        throw new Error("Unexpected query in notification reliability test");
    });
};

describe("Notification reliability", () => {
    beforeEach(() => {
        setSocketIO(null);
        pool.query.mockReset();
        mockApplicationQueries();
    });

    afterEach(() => {
        setSocketIO(null);
        jest.restoreAllMocks();
    });

    test("business operation succeeds and emits notification when delivery succeeds", async () => {
        const emit = jest.fn();
        const to = jest.fn(() => ({ emit }));
        setSocketIO({ to });

        const response = await invokeCreateApplication();

        expect(response.statusCode).toBe(201);
        expect(response.body.data.application.id).toBe("51");
        expect(to).toHaveBeenCalledWith("user:3");
        expect(emit).toHaveBeenCalledWith("newNotification", notification);
    });

    test("business operation succeeds when notification persistence fails and logs safely", async () => {
        const sensitiveError = new Error("database detail with secret token");
        const errorLogger = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});
        mockApplicationQueries({ notificationError: sensitiveError });

        const response = await invokeCreateApplication();

        expect(response.statusCode).toBe(201);
        expect(response.body.data.application.id).toBe("51");
        expect(errorLogger).toHaveBeenCalledWith(
            "Notification persistence failed",
        );
        expect(JSON.stringify(errorLogger.mock.calls))
            .not.toContain("database detail with secret token");
    });

    test("business operation succeeds when socket emission fails and logs safely", async () => {
        const sensitiveError = new Error("socket error with credential");
        const errorLogger = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});
        setSocketIO({
            to: () => ({
                emit: () => {
                    throw sensitiveError;
                },
            }),
        });

        const response = await invokeCreateApplication();

        expect(response.statusCode).toBe(201);
        expect(response.body.data.application.id).toBe("51");
        expect(errorLogger).toHaveBeenCalledWith(
            "Notification emission failed",
        );
        expect(JSON.stringify(errorLogger.mock.calls))
            .not.toContain("socket error with credential");
    });

    test("createNotification returns the stored notification when delivery succeeds", async () => {
        const emit = jest.fn();
        setSocketIO({ to: () => ({ emit }) });

        const result = await createNotification({
            userId: 3,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            referenceType: notification.reference_type,
            referenceId: notification.reference_id,
        });

        expect(result).toEqual(notification);
        expect(emit).toHaveBeenCalledWith("newNotification", notification);
    });
});
