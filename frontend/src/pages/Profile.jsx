import { useEffect, useState } from "react";
import api from "../services/api";

function Profile() {
    const [profile, setProfile] = useState(null);
    const [skills, setSkills] = useState([]);
    const [availableSkills, setAvailableSkills] = useState([]);

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

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [skillError, setSkillError] = useState("");
    const [skillSuccess, setSkillSuccess] = useState("");

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

        fetchProfile();
        fetchSkills();
        fetchAvailableSkills();
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

                                        {/* Edit Proficiency */}
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

                                        {/* Remove Skill */}
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

                    {/* Skill Messages */}
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