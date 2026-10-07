import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function CreateProject() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        budgetMin: "",
        budgetMax: "",
        experienceLevel: "intermediate",
        deadline: "",
        companyId: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");

        if (!formData.title.trim()) {
            setError("Project title is required.");
            return;
        }

        if (!formData.description.trim()) {
            setError("Project description is required.");
            return;
        }

        if (
            formData.budgetMin &&
            formData.budgetMax &&
            Number(formData.budgetMin) >
                Number(formData.budgetMax)
        ) {
            setError(
                "Minimum budget cannot be greater than maximum budget."
            );
            return;
        }

        try {
            setLoading(true);

            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                budgetMin: formData.budgetMin
                    ? Number(formData.budgetMin)
                    : null,
                budgetMax: formData.budgetMax
                    ? Number(formData.budgetMax)
                    : null,
                experienceLevel:
                    formData.experienceLevel || null,
                deadline: formData.deadline || null,
                companyId: formData.companyId
                    ? Number(formData.companyId)
                    : null,
            };

            await api.post("/projects", payload);

            navigate("/my-projects");
        } catch (error) {
            console.error(
                "Failed to create project:",
                error
            );

            setError(
                error.response?.data?.message ||
                    "Failed to create project."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-3xl px-6 py-10">
                <div className="mb-8">
                    <button
                        type="button"
                        onClick={() =>
                            navigate("/my-projects")
                        }
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                        ← Back to My Projects
                    </button>

                    <h1 className="mt-5 text-3xl font-bold text-gray-900">
                        Create Project
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Post a project and start receiving
                        proposals from freelancers.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="rounded-xl bg-white p-6 shadow-sm"
                >
                    <div className="space-y-6">
                        <div>
                            <label
                                htmlFor="title"
                                className="mb-2 block text-sm font-semibold text-gray-700"
                            >
                                Project Title
                            </label>

                            <input
                                id="title"
                                name="title"
                                type="text"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. E-Commerce Website Development"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="description"
                                className="mb-2 block text-sm font-semibold text-gray-700"
                            >
                                Project Description
                            </label>

                            <textarea
                                id="description"
                                name="description"
                                rows="7"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the project, requirements, technologies, and expected outcome..."
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="budgetMin"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Minimum Budget
                                </label>

                                <input
                                    id="budgetMin"
                                    name="budgetMin"
                                    type="number"
                                    min="0"
                                    value={formData.budgetMin}
                                    onChange={handleChange}
                                    placeholder="50000"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="budgetMax"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    Maximum Budget
                                </label>

                                <input
                                    id="budgetMax"
                                    name="budgetMax"
                                    type="number"
                                    min="0"
                                    value={formData.budgetMax}
                                    onChange={handleChange}
                                    placeholder="90000"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="experienceLevel"
                                className="mb-2 block text-sm font-semibold text-gray-700"
                            >
                                Experience Level
                            </label>

                            <select
                                id="experienceLevel"
                                name="experienceLevel"
                                value={
                                    formData.experienceLevel
                                }
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="deadline"
                                className="mb-2 block text-sm font-semibold text-gray-700"
                            >
                                Deadline
                            </label>

                            <input
                                id="deadline"
                                name="deadline"
                                type="date"
                                value={formData.deadline}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="companyId"
                                className="mb-2 block text-sm font-semibold text-gray-700"
                            >
                                Company ID
                                <span className="ml-2 font-normal text-gray-400">
                                    Optional
                                </span>
                            </label>

                            <input
                                id="companyId"
                                name="companyId"
                                type="number"
                                min="1"
                                value={formData.companyId}
                                onChange={handleChange}
                                placeholder="Leave empty if not required"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />

                            <p className="mt-2 text-xs text-gray-500">
                                If provided, the company must
                                belong to your account.
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/my-projects")
                                }
                                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading
                                    ? "Creating..."
                                    : "Create Project"}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default CreateProject;