import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function CreateJob() {
    const navigate = useNavigate();

    const [companies, setCompanies] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    const [formData, setFormData] = useState({
        companyId: "",
        title: "",
        description: "",
        employmentType: "full_time",
        experienceLevel: "entry",
        location: "",
        isRemote: false,
        salaryMin: "",
        salaryMax: "",
        applicationDeadline: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const response = await api.get("/companies");

                setCompanies(response.data.data.companies);
            } catch (error) {
                console.error("Failed to fetch companies:", error);

                setError(
                    error.response?.data?.message ||
                        "Failed to load your companies."
                );
            } finally {
                setLoadingCompanies(false);
            }
        };

        fetchCompanies();
    }, []);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            await api.post("/jobs", {
                companyId: Number(formData.companyId),
                title: formData.title,
                description: formData.description,
                employmentType: formData.employmentType,
                experienceLevel: formData.experienceLevel,
                location: formData.location,
                isRemote: formData.isRemote,
                salaryMin: formData.salaryMin
                    ? Number(formData.salaryMin)
                    : null,
                salaryMax: formData.salaryMax
                    ? Number(formData.salaryMax)
                    : null,
                applicationDeadline:
                    formData.applicationDeadline || null,
            });

            navigate("/my-jobs");
        } catch (error) {
            console.error("Failed to create job:", error);

            setError(
                error.response?.data?.message ||
                    "Failed to create job."
            );
        } finally {
            setLoading(false);
        }
    };

    if (loadingCompanies) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">
                    Loading your companies...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-3xl px-6 py-10">
                <Link
                    to="/"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to Dashboard
                </Link>

                <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Post a Job
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Create a new job opportunity for talented
                        developers.
                    </p>

                    {error && (
                        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {companies.length === 0 ? (
                        <div className="mt-8 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
                            You don't have a company yet. Create a
                            company before posting a job.
                        </div>
                    ) : (
                        <form
                            onSubmit={handleSubmit}
                            className="mt-8 space-y-6"
                        >
                            <div>
                                <label
                                    htmlFor="companyId"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Company
                                </label>

                                <select
                                    id="companyId"
                                    name="companyId"
                                    value={formData.companyId}
                                    onChange={handleChange}
                                    required
                                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                                >
                                    <option value="">
                                        Select a company
                                    </option>

                                    {companies.map((company) => (
                                        <option
                                            key={company.id}
                                            value={company.id}
                                        >
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="title"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Job Title
                                </label>

                                <input
                                    id="title"
                                    name="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Junior Java Developer"
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="description"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Job Description
                                </label>

                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows="7"
                                    placeholder="Describe the role, responsibilities, and requirements..."
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="employmentType"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Employment Type
                                    </label>

                                    <select
                                        id="employmentType"
                                        name="employmentType"
                                        value={
                                            formData.employmentType
                                        }
                                        onChange={handleChange}
                                        required
                                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                                    >
                                        <option value="full_time">
                                            Full Time
                                        </option>

                                        <option value="part_time">
                                            Part Time
                                        </option>

                                        <option value="contract">
                                            Contract
                                        </option>

                                        <option value="internship">
                                            Internship
                                        </option>

                                        <option value="freelance">
                                            Freelance
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="experienceLevel"
                                        className="block text-sm font-medium text-gray-700"
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
                                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                                    >
                                        <option value="entry">
                                            Entry
                                        </option>

                                        <option value="intermediate">
                                            Intermediate
                                        </option>

                                        <option value="senior">
                                            Senior
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div>
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
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="e.g. Noida, India"
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                />
                            </div>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="isRemote"
                                    checked={formData.isRemote}
                                    onChange={handleChange}
                                    className="h-4 w-4 rounded border-gray-300"
                                />

                                <span className="text-sm font-medium text-gray-700">
                                    This job supports remote work
                                </span>
                            </label>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="salaryMin"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Minimum Salary
                                    </label>

                                    <input
                                        id="salaryMin"
                                        name="salaryMin"
                                        type="number"
                                        min="0"
                                        value={formData.salaryMin}
                                        onChange={handleChange}
                                        placeholder="400000"
                                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="salaryMax"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Maximum Salary
                                    </label>

                                    <input
                                        id="salaryMax"
                                        name="salaryMax"
                                        type="number"
                                        min="0"
                                        value={formData.salaryMax}
                                        onChange={handleChange}
                                        placeholder="700000"
                                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="applicationDeadline"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Application Deadline
                                </label>

                                <input
                                    id="applicationDeadline"
                                    name="applicationDeadline"
                                    type="date"
                                    value={
                                        formData.applicationDeadline
                                    }
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading
                                    ? "Creating Job..."
                                    : "Create Job"}
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}

export default CreateJob;