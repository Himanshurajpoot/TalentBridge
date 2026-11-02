import { useState } from "react";
import { getProfilePhotoSrc } from "../utils/profilePhoto";

function ProfileAvatar({ name, photoUrl, className = "" }) {
    const imageSrc = getProfilePhotoSrc(photoUrl);
    const [failedSrc, setFailedSrc] = useState("");
    const initials =
        name
            ?.trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || "?";

    return (
        <span
            role="img"
            aria-label={`Profile photo for ${name || "user"}`}
            className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-semibold text-blue-700 ${className}`}
        >
            {imageSrc && failedSrc !== imageSrc ? (
                <img
                    src={imageSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setFailedSrc(imageSrc)}
                />
            ) : (
                <span aria-hidden="true">{initials}</span>
            )}
        </span>
    );
}

export default ProfileAvatar;
