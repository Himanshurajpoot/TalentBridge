import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function CreateJob() {
    const navigate = useNavigate();

    const [companies, setCompanies] = useState([]);
    const [skills, setSkills] = useState([]);

    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingSkills, setLoadingSkills] = useState(true);
    const [companyLoadError, setCompanyLoadError] = useState("");
    const [companyRetryCount, setCompanyRetryCount] = useState(0);
    const [companyName, setCompanyName] = useState("");
    const [creatingCompany, setCreatingCompany] = useState(false);
    const [companyCreationError, setCompanyCreationError] = useState("");
    const [companyCreationSuccess, setCompanyCreationSuccess] =
        useState("");

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

    const [selectedSkillIds, setSelectedSkillIds] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchCompanies = async () => {
            setLoadingCompanies(true);
            setCompanyLoadError("");

            try {
                const response = await api.get("/companies");

                setCompanies(response.data.data.companies || []);
            } catch (error) {
                console.error("Failed to fetch companies:", error);

                setCompanyLoadError(
                    error.response?.data?.message ||
                        "Failed to load your companies."
                );
            } finally {
                setLoadingCompanies(false);
            }
        };

        const fetchSkills = async () => {
            try {
                const response = await api.get("/skills");

                setSkills(
                    response.data.data.skills || []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch skills:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                        "Failed to load available skills."
                );
            } finally {
                setLoadingSkills(false);
            }
        };

        fetchCompanies();
        fetchSkills();
    }, [companyRetryCount]);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleCreateCompany = async (event) => {
        event.preventDefault();

        if (creatingCompany) {
            return;
        }

        setCreatingCompany(true);
        setCompanyCreationError("");
        setCompanyCreationSuccess("");

        try {
            const response = await api.post("/companies", {
                name: companyName,
            });
            const company = response.data.data.company;

            setCompanies((current) => [company, ...current]);
            setFormData((current) => ({
                ...current,
                companyId: String(company.id),
            }));
            setCompanyName("");
            setCompanyCreationSuccess(
                "Company created. You can now continue posting your job."
            );
        } catch (error) {
            console.error("Failed to create company:", error);
            setCompanyCreationError(
                error.response?.data?.message ||
                    "Unable to create your company. Please try again."
            );
        } finally {
            setCreatingCompany(false);
        }
    };

    const handleSkillChange = (skillId) => {
        setSelectedSkillIds((current) => {
            if (current.includes(skillId)) {
                return current.filter(
                    (id) => id !== skillId
                );
            }

            return [...current, skillId];
        });
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
                skillIds: selectedSkillIds,
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

    if (loadingCompanies || loadingSkills) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">
                    Loading job form...
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

                    {companyLoadError ? (
                        <div className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                            <p>{companyLoadError}</p>
                            <button
                                type="button"
                                onClick={() =>
                                    setCompanyRetryCount((count) => count + 1)
                                }
                                className="mt-3 font-semibold text-red-800 underline"
                            >
                                Try loading companies again
                            </button>
                        </div>
                    ) : companies.length === 0 ? (
                        <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
                            <h2 className="font-semibold text-amber-900">
                                Create a company to post a job
                            </h2>
                            <p className="mt-1 text-sm text-amber-800">
                                A company is required before you can publish
                                a job. Once it is created, the job form will
                                be available here.
                            </p>

                            {companyCreationError && (
                                <div
                                    role="alert"
                                    className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                                >
                                    {companyCreationError}
                                </div>
                            )}

                            <form
                                onSubmit={handleCreateCompany}
                                className="mt-5"
                            >
                                <label
                                    htmlFor="companyName"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Company Name
                                </label>
                                <input
                                    id="companyName"
                                    name="companyName"
                                    type="text"
                                    value={companyName}
                                    onChange={(event) =>
                                        setCompanyName(event.target.value)
                                    }
                                    required
                                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                                    placeholder="Your company name"
                                />
                                <button
                                    type="submit"
                                    disabled={creatingCompany}
                                    className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {creatingCompany
                                        ? "Creating company..."
                                        : "Create Company"}
                                </button>
                            </form>
                        </section>
                    ) : (
                        <>
                            {companyCreationSuccess && (
                                <p
                                    role="status"
                                    className="mt-6 rounded-lg bg-green-50 p-3 text-sm text-green-700"
                                >
                                    {companyCreationSuccess}
                                </p>
                            )}
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

                            <div>
                                <h2 className="text-sm font-medium text-gray-700">
                                    Skills
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Select the skills required
                                    for this job.
                                </p>

                                {skills.length === 0 ? (
                                    <p className="mt-3 text-sm text-gray-500">
                                        No skills available.
                                    </p>
                                ) : (
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        {skills.map(
                                            (skill) => (
                                                <label
                                                    key={
                                                        skill.id
                                                    }
                                                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSkillIds.includes(
                                                            Number(
                                                                skill.id
                                                            )
                                                        )}
                                                        onChange={() =>
                                                            handleSkillChange(
                                                                Number(
                                                                    skill.id
                                                                )
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-gray-300"
                                                    />

                                                    <span className="text-sm font-medium text-gray-700">
                                                        {
                                                            skill.name
                                                        }
                                                    </span>
                                                </label>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

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
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default CreateJob;