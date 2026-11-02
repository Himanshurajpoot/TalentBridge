export function getProfilePhotoSrc(photoUrl) {
    if (typeof photoUrl !== "string" || !photoUrl) {
        return "";
    }

    if (/^blob:/i.test(photoUrl) || /^https?:\/\//i.test(photoUrl)) {
        return photoUrl;
    }

    if (!photoUrl.startsWith("/uploads/profile-photos/")) {
        return "";
    }

    const apiUrl = import.meta.env.VITE_API_URL;

    if (!apiUrl) {
        return photoUrl;
    }

    try {
        const backendOrigin = new URL(
            apiUrl,
            window.location.origin
        ).origin;

        return new URL(photoUrl, backendOrigin).toString();
    } catch {
        return photoUrl;
    }
}
