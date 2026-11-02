const pool = require("../config/db");
const { randomUUID } = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const profilePhotoDirectory = path.resolve(
    __dirname,
    "../../uploads/profile-photos"
);
const profilePhotoUrlPrefix = "/uploads/profile-photos/";

const getPhotoExtension = (file) => {
    const { buffer, mimetype } = file;

    if (mimetype === "image/jpeg") {
        return buffer.length >= 3 &&
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff
            ? ".jpg"
            : null;
    }

    if (mimetype === "image/png") {
        return buffer.length >= 8 &&
            buffer.subarray(0, 8).equals(
                Buffer.from([
                    0x89, 0x50, 0x4e, 0x47,
                    0x0d, 0x0a, 0x1a, 0x0a,
                ])
            )
            ? ".png"
            : null;
    }

    if (mimetype === "image/webp") {
        return buffer.length >= 12 &&
            buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP" &&
            buffer.readUInt32LE(4) + 8 === buffer.length
            ? ".webp"
            : null;
    }

    return null;
};

const getManagedPhotoPath = (photoUrl) => {
    const match =
        typeof photoUrl === "string" &&
        photoUrl.match(
            /^\/uploads\/profile-photos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)$/i
        );

    return match
        ? path.join(profilePhotoDirectory, path.basename(photoUrl))
        : null;
};

const removeManagedPhoto = async (photoUrl) => {
    const filePath = getManagedPhotoPath(photoUrl);

    if (!filePath) {
        return;
    }

    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
};

const getMyProfile = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.id,
                p.user_id,
                p.bio,
                p.headline,
                p.location,
                p.phone,
                p.avatar_url,
                p.resume_url,
                p.hourly_rate,
                p.experience_years,
                p.created_at,
                p.updated_at,

                u.full_name,
                u.email,
                u.role

             FROM profiles p
             JOIN users u ON u.id = p.user_id
             WHERE p.user_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Profile not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                profile: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


const upsertMyProfile = async (req, res) => {
    try {
        const {
            bio,
            headline,
            location,
            phone,
            resumeUrl,
            hourlyRate,
            experienceYears,
        } = req.body;

        // Validate numeric fields
        if (
            hourlyRate != null &&
            (isNaN(Number(hourlyRate)) || Number(hourlyRate) < 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "hourlyRate must be a valid non-negative number",
            });
        }

        if (
            experienceYears != null &&
            (isNaN(Number(experienceYears)) ||
                Number(experienceYears) < 0)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "experienceYears must be a valid non-negative number",
            });
        }

        const result = await pool.query(
            `INSERT INTO profiles (
                user_id,
                bio,
                headline,
                location,
                phone,
                resume_url,
                hourly_rate,
                experience_years
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (user_id)
            DO UPDATE SET
                bio = EXCLUDED.bio,
                headline = EXCLUDED.headline,
                location = EXCLUDED.location,
                phone = EXCLUDED.phone,
                resume_url = EXCLUDED.resume_url,
                hourly_rate = EXCLUDED.hourly_rate,
                experience_years = EXCLUDED.experience_years,
                updated_at = NOW()
            RETURNING *`,
            [
                req.user.id,
                bio?.trim() || null,
                headline?.trim() || null,
                location?.trim() || null,
                phone?.trim() || null,
                resumeUrl?.trim() || null,
                hourlyRate ?? null,
                experienceYears ?? null,
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Profile saved successfully",
            data: {
                profile: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Save profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const uploadMyProfilePhoto = async (req, res) => {
    const extension = getPhotoExtension(req.file);

    if (!extension) {
        return res.status(400).json({
            success: false,
            message:
                "The uploaded file does not match a supported image format",
        });
    }

    const fileName = `${randomUUID()}${extension}`;
    const photoUrl = `${profilePhotoUrlPrefix}${fileName}`;
    const filePath = path.join(profilePhotoDirectory, fileName);
    let newPhotoWritten = false;

    try {
        const currentPhoto = await pool.query(
            "SELECT avatar_url FROM profiles WHERE user_id = $1",
            [req.user.id]
        );

        await fs.mkdir(profilePhotoDirectory, {
            recursive: true,
            mode: 0o750,
        });
        await fs.writeFile(filePath, req.file.buffer, {
            flag: "wx",
            mode: 0o640,
        });
        newPhotoWritten = true;

        const result = await pool.query(
            `INSERT INTO profiles (user_id, avatar_url)
             VALUES ($1, $2)
             ON CONFLICT (user_id)
             DO UPDATE SET
                avatar_url = EXCLUDED.avatar_url,
                updated_at = NOW()
             RETURNING avatar_url`,
            [req.user.id, photoUrl]
        );

        let cleanupWarning = false;

        try {
            await removeManagedPhoto(
                currentPhoto.rows[0]?.avatar_url
            );
        } catch (error) {
            cleanupWarning = true;
            console.error(
                "Previous profile photo cleanup failed:",
                error.message
            );
        }

        return res.status(200).json({
            success: true,
            message: cleanupWarning
                ? "Profile photo updated, but the previous file could not be removed"
                : "Profile photo updated successfully",
            data: {
                profile: result.rows[0],
                cleanupWarning,
            },
        });
    } catch (error) {
        if (newPhotoWritten) {
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                if (cleanupError.code !== "ENOENT") {
                    console.error(
                        "Uncommitted profile photo cleanup failed:",
                        cleanupError.message
                    );
                }
            }
        }

        console.error("Upload profile photo error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to save profile photo",
        });
    }
};

const removeMyProfilePhoto = async (req, res) => {
    try {
        const currentPhoto = await pool.query(
            "SELECT avatar_url FROM profiles WHERE user_id = $1",
            [req.user.id]
        );

        const result = await pool.query(
            `UPDATE profiles
             SET avatar_url = NULL, updated_at = NOW()
             WHERE user_id = $1
             RETURNING avatar_url`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Profile photo removed",
                data: {
                    profile: { avatar_url: null },
                },
            });
        }

        try {
            await removeManagedPhoto(
                currentPhoto.rows[0]?.avatar_url
            );
        } catch (error) {
            console.error(
                "Removed profile photo file cleanup failed:",
                error.message
            );

            return res.status(500).json({
                success: false,
                photoRemoved: true,
                message:
                    "The profile photo was removed, but its stored file could not be deleted",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile photo removed",
            data: {
                profile: result.rows[0],
            },
        });
    } catch (error) {
        console.error("Remove profile photo error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to remove profile photo",
        });
    }
};

module.exports = {
    getMyProfile,
    upsertMyProfile,
    uploadMyProfilePhoto,
    removeMyProfilePhoto,
};