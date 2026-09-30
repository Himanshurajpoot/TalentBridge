import { useEffect, useState } from "react";
import api from "../services/api";

function Profile() {
    const [profile, setProfile] = useState(null);
    const [skills, setSkills] = useState([]);
    const [availableSkills, setAvailableSkills] = useState([]);
    const [portfolioProjects, setPortfolioProjects] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState({
        averageRating: 0,
        reviewCount: 0,
    });

    const [form, setForm] = useState({
        headline: "",
        bio: "",
        location: "",
        phone: "",
        hourlyRate: "",
        experienceYears: "",
        resumeUrl: "",
    });

    const [skillForm, setSkillForm] = useState({
        skillId: "",
        proficiency: "intermediate",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingSkill, setAddingSkill] = useState(false);
    const [removingSkillId, setRemovingSkillId] = useState(null);
    const [updatingSkillId, setUpdatingSkillId] = useState(null);
    const [portfolioLoading, setPortfolioLoading] = useState(true);
    const [reviewsLoading, setReviewsLoading] = useState(true);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [skillError, setSkillError] = useState("");
    const [skillSuccess, setSkillSuccess] = useState("");
    const [portfolioError, setPortfolioError] = useState("");
    const [reviewsError, setReviewsError] = useState("");

    const getLoggedInUserId = () => {
        try {
            const token = localStorage.getItem("token");

            if (!token) {
                return null;
            }

            const payload = JSON.parse(
                atob(
                    token
                        .split(".")[1]
                        .replace(/-/g, "+")
                        .replace(/_/g, "/")
                )
            );

            return payload.userId || null;
        } catch (error) {
            console.error(
                "Failed to read logged-in user from token:",
                error
            );

            return null;
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get("/profile/me");

                const data = response.data.data.profile;

                setProfile(data);

                setForm({
                    headline: data?.headline ?? "",
                    bio: data?.bio ?? "",
                    location: data?.location ?? "",
                    phone: data?.phone ?? "",
                    hourlyRate: data?.hourly_rate ?? "",
                    experienceYears:
                        data?.experience_years ?? "",
                    resumeUrl: data?.resume_url ?? "",
                });
            } catch (error) {
                console.error(
                    "Failed to fetch profile:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                        "Failed to load profile."
                );
            } finally {
                setLoading(false);
            }
        };

        const fetchSkills = async () => {
            try {
                const response = await api.get(
                    "/profile/me/skills"
                );

                setSkills(
                    response.data.data.skills || []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch skills:",
                    error
                );
            }
        };

        const fetchAvailableSkills = async () => {
            try {
                const response = await api.get(
                    "/skills"
                );

                setAvailableSkills(
                    response.data.data.skills || []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch available skills:",
                    error
                );
            }
        };

        const fetchPortfolioProjects = async () => {
            try {
                setPortfolioLoading(true);
                setPortfolioError("");

                const userId = getLoggedInUserId();

                if (!userId) {
                    setPortfolioProjects([]);
                    setPortfolioError(
                        "Unable to identify the logged-in user."
                    );
                    return;
                }

                const response = await api.get(
                    `/projects/user/${userId}/portfolio`
                );

                setPortfolioProjects(
                    response.data.data.projects || []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch portfolio projects:",
                    error
                );

                setPortfolioError(
                    error.response?.data?.message ||
                        "Failed to load portfolio projects."
                );
            } finally {
                setPortfolioLoading(false);
            }
        };

        const fetchRatingAndReviews = async () => {
            try {
                setReviewsLoading(true);
                setReviewsError("");

                const userId = getLoggedInUserId();

                if (!userId) {
                    setRating({
                        averageRating: 0,
                        reviewCount: 0,
                    });

                    setReviews([]);

                    setReviewsError(
                        "Unable to identify the logged-in user."
                    );

                    return;
                }

                const [ratingResponse, reviewsResponse] =
                    await Promise.all([
                        api.get(
                            `/users/${userId}/rating`
                        ),
                        api.get(
                            `/users/${userId}/reviews`
                        ),
                    ]);

                setRating(
                    ratingResponse.data.data || {
                        averageRating: 0,
                        reviewCount: 0,
                    }
                );

                setReviews(
                    reviewsResponse.data.data.reviews || []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch rating and reviews:",
                    error
                );

                setReviewsError(
                    error.response?.data?.message ||
                        "Failed to load rating and reviews."
                );
            } finally {
                setReviewsLoading(false);
            }
        };

        fetchProfile();
        fetchSkills();
        fetchAvailableSkills();
        fetchPortfolioProjects();
        fetchRatingAndReviews();
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleSkillChange = (event) => {
        const { name, value } = event.target;

        setSkillForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await api.put("/profile/me", {
                headline: form.headline,
                bio: form.bio,
                location: form.location,
                phone: form.phone,
                hourlyRate:
                    form.hourlyRate === ""
                        ? null
                        : Number(form.hourlyRate),
                experienceYears:
                    form.experienceYears === ""
                        ? null
                        : Number(form.experienceYears),
                resumeUrl: form.resumeUrl,
            });

            const updatedProfile =
                response.data.data.profile;

            setProfile(updatedProfile);

            setForm({
                headline: updatedProfile.headline ?? "",
                bio: updatedProfile.bio ?? "",
                location: updatedProfile.location ?? "",
                phone: updatedProfile.phone ?? "",
                hourlyRate:
                    updatedProfile.hourly_rate ?? "",
                experienceYears:
                    updatedProfile.experience_years ?? "",
                resumeUrl:
                    updatedProfile.resume_url ?? "",
            });

            setSuccess(
                "Profile updated successfully."
            );
        } catch (error) {
            console.error(
                "Failed to update profile:",
                error
            );

            setError(
                error.response?.data?.message ||
                    "Failed to update profile."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleAddSkill = async (event) => {
        event.preventDefault();

        setAddingSkill(true);
        setSkillError("");
        setSkillSuccess("");

        if (!skillForm.skillId) {
            setSkillError("Please select a skill.");
            setAddingSkill(false);
            return;
        }

        try {
            const response = await api.post(
                "/profile/me/skills",
                {
                    skillId: Number(skillForm.skillId),
                    proficiency:
                        skillForm.proficiency,
                }
            );

            const addedSkill =
                response.data.data.skill;

            const userSkill =
                response.data.data.userSkill;

            setSkills((current) => [
                ...current,
                {
                    id: addedSkill.id,
                    name: addedSkill.name,
                    proficiency:
                        userSkill.proficiency,
                },
            ]);

            setSkillForm({
                skillId: "",
                proficiency: "intermediate",
            });

            setSkillSuccess(
                "Skill added successfully."
            );
        } catch (error) {
            console.error(
                "Failed to add skill:",
                error
            );

            setSkillError(
                error.response?.data?.message ||
                    "Failed to add skill."
            );
        } finally {
            setAddingSkill(false);
        }
    };

    const handleUpdateSkill = async (
        skillId,
        proficiency
    ) => {
        setUpdatingSkillId(skillId);
        setSkillError("");
        setSkillSuccess("");

        try {
            const response = await api.patch(
                `/profile/me/skills/${skillId}`,
                {
                    proficiency,
                }
            );

            const updatedSkill =
                response.data.data.userSkill;

            setSkills((current) =>
                current.map((skill) =>
                    skill.id === skillId
                        ? {
                              ...skill,
                              proficiency:
                                  updatedSkill.proficiency,
                          }
                        : skill
                )
            );

            setSkillSuccess(
                "Skill proficiency updated successfully."
            );
        } catch (error) {
            console.error(
                "Failed to update skill proficiency:",
                error
            );

            setSkillError(
                error.response?.data?.message ||
                    "Failed to update skill proficiency."
            );
        } finally {
            setUpdatingSkillId(null);
        }
    };

    const handleRemoveSkill = async (skillId) => {
        const confirmed = window.confirm(
            "Are you sure you want to remove this skill?"
        );

        if (!confirmed) {
            return;
        }

        setRemovingSkillId(skillId);
        setSkillError("");
        setSkillSuccess("");

        try {
            await api.delete(
                `/profile/me/skills/${skillId}`
            );

            setSkills((current) =>
                current.filter(
                    (skill) => skill.id !== skillId
                )
            );

            setSkillSuccess(
                "Skill removed successfully."
            );
        } catch (error) {
            console.error(
                "Failed to remove skill:",
                error
            );

            setSkillError(
                error.response?.data?.message ||
                    "Failed to remove skill."
            );
        } finally {
            setRemovingSkillId(null);
        }
    };

    const getStatusStyles = (status) => {
        if (status === "completed") {
            return "bg-green-100 text-green-700";
        }

        if (status === "in_progress") {
            return "bg-yellow-100 text-yellow-700";
        }

        return "bg-gray-100 text-gray-700";
    };

    const getStatusLabel = (status) => {
        if (status === "completed") {
            return "Completed";
        }

        if (status === "in_progress") {
            return "In Progress";
        }

        return status;
    };

    const renderStars = (value) => {
        const roundedRating = Math.round(
            Number(value) || 0
        );

        return (
            <div
                className="flex items-center gap-1"
                aria-label={`${value} out of 5 stars`}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={
                            star <= roundedRating
                                ? "text-yellow-500"
                                : "text-gray-300"
                        }
                    >
                        ★
                    </span>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <main className="mx-auto max-w-4xl px-6 py-10">
                    <p className="text-gray-600">
                        Loading profile...
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-4xl px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        My Profile
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Manage your professional profile.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-600">
                        {success}
                    </div>
                )}

                {/* Profile Form */}
                <form
                    onSubmit={handleSubmit}
                    className="rounded-xl bg-white p-6 shadow-sm"
                >
                    <div>
                        <label
                            htmlFor="headline"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Professional Headline
                        </label>

                        <input
                            id="headline"
                            name="headline"
                            type="text"
                            value={form.headline}
                            onChange={handleChange}
                            placeholder="Junior Java Developer"
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="mt-6">
                        <label
                            htmlFor="bio"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Bio
                        </label>

                        <textarea
                            id="bio"
                            name="bio"
                            rows="5"
                            value={form.bio}
                            onChange={handleChange}
                            placeholder="Tell clients about yourself..."
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="mt-6">
                        <label
                            htmlFor="location"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Location
                        </label>

                        <input
                            id="location"
                            name="location"
                            type="text"
                            value={form.location}
                            onChange={handleChange}
                            placeholder="Noida, India"
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="mt-6">
                        <label
                            htmlFor="phone"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Phone
                        </label>

                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="9876543210"
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div>
                            <label
                                htmlFor="hourlyRate"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Hourly Rate (₹)
                            </label>

                            <input
                                id="hourlyRate"
                                name="hourlyRate"
                                type="number"
                                min="0"
                                value={form.hourlyRate}
                                onChange={handleChange}
                                placeholder="500"
                                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="experienceYears"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Experience (Years)
                            </label>

                            <input
                                id="experienceYears"
                                name="experienceYears"
                                type="number"
                                min="0"
                                step="0.1"
                                value={form.experienceYears}
                                onChange={handleChange}
                                placeholder="0"
                                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mt-6">
                        <label
                            htmlFor="resumeUrl"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Resume URL
                        </label>

                        <input
                            id="resumeUrl"
                            name="resumeUrl"
                            type="url"
                            value={form.resumeUrl}
                            onChange={handleChange}
                            placeholder="https://example.com/resume.pdf"
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="mt-8">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving
                                ? "Saving..."
                                : "Save Profile"}
                        </button>
                    </div>
                </form>

                {/* Rating Summary */}
                <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Rating
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Feedback from clients and project partners.
                            </p>
                        </div>

                        {!reviewsLoading && !reviewsError && (
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-gray-900">
                                        {Number(
                                            rating.averageRating || 0
                                        ).toFixed(2)}
                                    </p>

                                    <div className="mt-1">
                                        {renderStars(
                                            rating.averageRating
                                        )}
                                    </div>
                                </div>

                                <div className="border-l border-gray-200 pl-4">
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {rating.reviewCount || 0}
                                    </p>

                                    <p className="text-sm text-gray-500">
                                        {rating.reviewCount === 1
                                            ? "Review"
                                            : "Reviews"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {reviewsLoading ? (
                        <p className="mt-6 text-sm text-gray-500">
                            Loading rating and reviews...
                        </p>
                    ) : reviewsError ? (
                        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                            {reviewsError}
                        </div>
                    ) : null}
                </div>

                {/* Reviews */}
                {!reviewsLoading && !reviewsError && (
                    <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Reviews
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Reviews you have received from other users.
                            </p>
                        </div>

                        {reviews.length === 0 ? (
                            <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center">
                                <p className="font-medium text-gray-700">
                                    No reviews yet.
                                </p>

                                <p className="mt-2 text-sm text-gray-500">
                                    Reviews from completed projects will
                                    appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-5">
                                {reviews.map((review) => (
                                    <div
                                        key={review.id}
                                        className="rounded-xl border border-gray-200 p-5"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {review.reviewer_name ||
                                                        "Anonymous User"}
                                                </p>

                                                {review.project_title && (
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        Project:{" "}
                                                        {
                                                            review.project_title
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-start sm:items-end">
                                                {renderStars(
                                                    review.rating
                                                )}

                                                <span className="mt-1 text-sm text-gray-500">
                                                    {review.rating}/5
                                                </span>
                                            </div>
                                        </div>

                                        {review.comment && (
                                            <p className="mt-4 leading-6 text-gray-700">
                                                {review.comment}
                                            </p>
                                        )}

                                        {review.created_at && (
                                            <p className="mt-4 text-xs text-gray-400">
                                                {new Date(
                                                    review.created_at
                                                ).toLocaleDateString(
                                                    "en-IN"
                                                )}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Skills */}
                <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900">
                        My Skills
                    </h2>

                    {skills.length === 0 ? (
                        <p className="mt-4 text-sm text-gray-500">
                            No skills added yet.
                        </p>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {skills.map((skill) => (
                                <div
                                    key={skill.id}
                                    className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {skill.name}
                                        </p>

                                        <p className="mt-1 text-sm text-gray-500">
                                            Proficiency
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <select
                                            value={
                                                skill.proficiency ||
                                                "intermediate"
                                            }
                                            onChange={(event) =>
                                                handleUpdateSkill(
                                                    skill.id,
                                                    event.target.value
                                                )
                                            }
                                            disabled={
                                                updatingSkillId ===
                                                skill.id
                                            }
                                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <option value="beginner">
                                                Beginner
                                            </option>

                                            <option value="intermediate">
                                                Intermediate
                                            </option>

                                            <option value="advanced">
                                                Advanced
                                            </option>

                                            <option value="expert">
                                                Expert
                                            </option>
                                        </select>

                                        {updatingSkillId ===
                                            skill.id && (
                                            <span className="text-sm text-gray-500">
                                                Saving...
                                            </span>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveSkill(
                                                    skill.id
                                                )
                                            }
                                            disabled={
                                                removingSkillId ===
                                                skill.id
                                            }
                                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {removingSkillId ===
                                            skill.id
                                                ? "Removing..."
                                                : "Remove"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {skillError && (
                        <p className="mt-4 text-sm text-red-600">
                            {skillError}
                        </p>
                    )}

                    {skillSuccess && (
                        <p className="mt-4 text-sm text-green-600">
                            {skillSuccess}
                        </p>
                    )}

                    {/* Add Skill */}
                    <form
                        onSubmit={handleAddSkill}
                        className="mt-8 border-t pt-6"
                    >
                        <h3 className="text-lg font-semibold text-gray-900">
                            Add Skill
                        </h3>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="skillId"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Skill
                                </label>

                                <select
                                    id="skillId"
                                    name="skillId"
                                    value={skillForm.skillId}
                                    onChange={handleSkillChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                                >
                                    <option value="">
                                        Select a skill
                                    </option>

                                    {availableSkills.map(
                                        (skill) => (
                                            <option
                                                key={skill.id}
                                                value={skill.id}
                                            >
                                                {skill.name}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="proficiency"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Proficiency
                                </label>

                                <select
                                    id="proficiency"
                                    name="proficiency"
                                    value={
                                        skillForm.proficiency
                                    }
                                    onChange={handleSkillChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                                >
                                    <option value="beginner">
                                        Beginner
                                    </option>

                                    <option value="intermediate">
                                        Intermediate
                                    </option>

                                    <option value="advanced">
                                        Advanced
                                    </option>

                                    <option value="expert">
                                        Expert
                                    </option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={addingSkill}
                            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {addingSkill
                                ? "Adding..."
                                : "Add Skill"}
                        </button>
                    </form>
                </div>

                {/* Portfolio */}
                <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                My Portfolio
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Projects you have been hired for.
                            </p>
                        </div>

                        {!portfolioLoading &&
                            portfolioProjects.length > 0 && (
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                                    {portfolioProjects.length}{" "}
                                    {portfolioProjects.length === 1
                                        ? "Project"
                                        : "Projects"}
                                </span>
                            )}
                    </div>

                    {portfolioLoading ? (
                        <p className="mt-6 text-sm text-gray-500">
                            Loading portfolio...
                        </p>
                    ) : portfolioError ? (
                        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                            {portfolioError}
                        </div>
                    ) : portfolioProjects.length === 0 ? (
                        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center">
                            <p className="font-medium text-gray-700">
                                No portfolio projects yet.
                            </p>

                            <p className="mt-2 text-sm text-gray-500">
                                Projects with accepted proposals will
                                appear here when they are in progress
                                or completed.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-5">
                            {portfolioProjects.map(
                                (project) => (
                                    <div
                                        key={project.id}
                                        className="rounded-xl border border-gray-200 p-5"
                                    >
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {project.title}
                                                </h3>

                                                {project.company_name && (
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        {
                                                            project.company_name
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <span
                                                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(
                                                    project.status
                                                )}`}
                                            >
                                                {getStatusLabel(
                                                    project.status
                                                )}
                                            </span>
                                        </div>

                                        <p className="mt-4 text-sm leading-6 text-gray-600">
                                            {project.description}
                                        </p>

                                        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                                            <div>
                                                <p className="text-gray-500">
                                                    Budget
                                                </p>

                                                <p className="mt-1 font-medium text-gray-900">
                                                    {project.budget_min !=
                                                        null &&
                                                    project.budget_max !=
                                                        null
                                                        ? `₹${Number(
                                                              project.budget_min
                                                          ).toLocaleString(
                                                              "en-IN"
                                                          )} - ₹${Number(
                                                              project.budget_max
                                                          ).toLocaleString(
                                                              "en-IN"
                                                          )}`
                                                        : project.budget_min !=
                                                          null
                                                        ? `From ₹${Number(
                                                              project.budget_min
                                                          ).toLocaleString(
                                                              "en-IN"
                                                          )}`
                                                        : project.budget_max !=
                                                          null
                                                        ? `Up to ₹${Number(
                                                              project.budget_max
                                                          ).toLocaleString(
                                                              "en-IN"
                                                          )}`
                                                        : "Not provided"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-gray-500">
                                                    Experience Level
                                                </p>

                                                <p className="mt-1 font-medium capitalize text-gray-900">
                                                    {project.experience_level ||
                                                        "Not provided"}
                                                </p>
                                            </div>
                                        </div>

                                        {project.deadline && (
                                            <div className="mt-4 text-sm">
                                                <span className="text-gray-500">
                                                    Deadline:{" "}
                                                </span>

                                                <span className="font-medium text-gray-900">
                                                    {new Date(
                                                        project.deadline
                                                    ).toLocaleDateString(
                                                        "en-IN"
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Current Profile */}
                {profile && (
                    <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Current Profile
                        </h2>

                        <div className="mt-4 grid gap-3 text-sm text-gray-600">
                            <p>
                                <strong>
                                    Headline:
                                </strong>{" "}
                                {profile.headline ||
                                    "Not provided"}
                            </p>

                            <p>
                                <strong>
                                    Location:
                                </strong>{" "}
                                {profile.location ||
                                    "Not provided"}
                            </p>

                            <p>
                                <strong>
                                    Hourly Rate:
                                </strong>{" "}
                                {profile.hourly_rate != null
                                    ? `₹${profile.hourly_rate}`
                                    : "Not provided"}
                            </p>

                            <p>
                                <strong>
                                    Experience:
                                </strong>{" "}
                                {profile.experience_years != null
                                    ? `${profile.experience_years} years`
                                    : "Not provided"}
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Profile;