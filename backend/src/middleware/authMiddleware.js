const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is not configured."
            );

            return res.status(500).json({
                success: false,
                message: "Authentication service is not configured",
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (
            !decoded ||
            !decoded.userId ||
            !decoded.role
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload",
            });
        }

        req.user = {
            id: decoded.userId,
            role: decoded.role,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

module.exports = authenticate;