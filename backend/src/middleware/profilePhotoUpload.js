const multer = require("multer");

const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 0,
        parts: 1,
    },
    fileFilter: (req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            const error = new Error(
                "Only JPEG, PNG, and WebP images are allowed"
            );
            error.code = "INVALID_PROFILE_PHOTO_TYPE";
            return callback(error);
        }

        return callback(null, true);
    },
}).single("photo");

const handleProfilePhotoUpload = (req, res, next) => {
    upload(req, res, (error) => {
        if (!error) {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "A profile photo is required",
                });
            }

            return next();
        }

        if (
            error instanceof multer.MulterError &&
            error.code === "LIMIT_FILE_SIZE"
        ) {
            return res.status(413).json({
                success: false,
                message: "Profile photos must not exceed 5 MB",
            });
        }

        if (
            error instanceof multer.MulterError ||
            error.code === "INVALID_PROFILE_PHOTO_TYPE"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    error.code === "INVALID_PROFILE_PHOTO_TYPE"
                        ? error.message
                        : "Invalid profile photo upload",
            });
        }

        return next(error);
    });
};

module.exports = handleProfilePhotoUpload;
