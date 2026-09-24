const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const createToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        {
            userId: user.id,
            role: user.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );
};

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const register = async (req, res) => {
    try {
        const {
            fullName,
            email,
            password,
            role,
        } = req.body;

        if (
            typeof fullName !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Full name, email and password are required",
            });
        }

        const normalizedFullName = fullName.trim();
        const normalizedEmail = email
            .trim()
            .toLowerCase();

        if (
            !normalizedFullName ||
            !normalizedEmail ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Full name, email and password are required",
            });
        }

        if (
            normalizedFullName.length < 2 ||
            normalizedFullName.length > 120
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Full name must be between 2 and 120 characters",
            });
        }

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters",
            });
        }

        if (password.length > 128) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must not exceed 128 characters",
            });
        }

        const allowedRoles = [
            "client",
            "freelancer",
        ];

        if (role && !allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message:
                    "Role must be client or freelancer",
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        const result = await pool.query(
            `INSERT INTO users
                (full_name, email, password_hash, role)
             VALUES
                ($1, $2, $3, $4)
             RETURNING id, full_name, email, role, created_at`,
            [
                normalizedFullName,
                normalizedEmail,
                passwordHash,
                role || "client",
            ]
        );

        const user = result.rows[0];
        const token = createToken(user);

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user,
                token,
            },
        });
    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required",
            });
        }

        const normalizedEmail = email
            .trim()
            .toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required",
            });
        }

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        const result = await pool.query(
            `SELECT
                id,
                full_name,
                email,
                password_hash,
                role
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const user = result.rows[0];

        const isPasswordValid =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = createToken(user);

        delete user.password_hash;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user,
                token,
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                full_name,
                email,
                role,
                created_at
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                user: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Get me error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
};