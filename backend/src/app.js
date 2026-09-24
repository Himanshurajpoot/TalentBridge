const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const companyRoutes = require("./routes/companyRoutes");
const profileRoutes = require("./routes/profileRoutes");
const skillRoutes = require("./routes/skillRoutes");
const projectRoutes = require("./routes/projectRoutes");
const proposalRoutes = require("./routes/proposalRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();

const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    methods: [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
    ],
};

app.use(cors(corsOptions));

app.options(
    /.*/,
    cors(corsOptions)
);

app.use(helmet());

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "TalentBridge API is running",
    });
});

app.get("/api/health/db", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        res.status(200).json({
            success: true,
            message: "PostgreSQL connection is working",
            database: "talentbridge",
            time: result.rows[0].current_time,
        });
    } catch (error) {
        console.error(
            "Database connection error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "PostgreSQL connection failed",
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", proposalRoutes);
app.use("/api", applicationRoutes);
app.use(
    "/api/conversations",
    conversationRoutes
);
app.use(
    "/api/notifications",
    notificationRoutes
);
app.use("/api", reviewRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

app.use((error, req, res, next) => {
    console.error("Unhandled error:", error);

    if (res.headersSent) {
        return next(error);
    }

    if (
        error instanceof SyntaxError &&
        error.status === 400 &&
        error.type === "entity.parse.failed"
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON",
        });
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

module.exports = app;