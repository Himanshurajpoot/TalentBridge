import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });

    const [filters, setFilters] = useState({
        search: "",
        employmentType: "",
        experienceLevel: "",
        isRemote: false,
        minSalary: "",
        maxSalary: "",
    });

    const fetchJobs = async (currentFilters = filters, page = 1) => {
        setLoading(true);
        setError("");

        try {
            const params = {
                page,
                limit: 10,
            };

            if (currentFilters.search.trim()) {
                params.search = currentFilters.search.trim();
            }

            if (currentFilters.employmentType) {
                params.employmentType = currentFilters.employmentType;
            }

            if (currentFilters.experienceLevel) {
                params.experienceLevel = currentFilters.experienceLevel;
            }

            if (currentFilters.isRemote) {
                params.isRemote = true;
            }

            if (currentFilters.minSalary) {
                params.minSalary = Number(currentFilters.minSalary);
            }

            if (currentFilters.maxSalary) {
                params.maxSalary = Number(currentFilters.maxSalary);
            }

            const response = await api.get("/jobs", {
                params,
            });

            setJobs(response.data.data.jobs || []);
            setPagination(
                response.data.data.pagination || {
                    page,
                    limit: 10,
                    total: 0,
                    totalPages: 0,
                }
            );
        } catch (error) {
            console.error("Failed to fetch jobs:", error);

            setError(
                error.response?.data?.message ||
                    "Failed to load jobs."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const loadInitialJobs = async () => {
            try {
                const response = await api.get("/jobs", {
                    params: {
                        page: 1,
                        limit: 10,
                    },
                });

                if (cancelled) {
                    return;
                }

                setJobs(response.data.data.jobs || []);
                setPagination(
                    response.data.data.pagination || {
                        page: 1,
                        limit: 10,
                        total: 0,
                        totalPages: 0,
                    }
                );
            } catch (error) {
                if (cancelled) {
                    return;
                }

                console.error("Failed to fetch jobs:", error);

                setError(
                    error.response?.data?.message ||
                        "Failed to load jobs."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadInitialJobs();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleChange = (event) => {
        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setFilters((current) => ({
            ...current,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        fetchJobs(filters, 1);
    };

    const handleClear = () => {
        const clearedFilters = {
            search: "",
            employmentType: "",
            experienceLevel: "",
            isRemote: false,
            minSalary: "",
            maxSalary: "",
        };

        setFilters(clearedFilters);
        fetchJobs(clearedFilters, 1);
    };

    const handlePageChange = (page) => {
        if (
            page < 1 ||
            page > pagination.totalPages ||
            page === pagination.page
        ) {
            return;
        }

        fetchJobs(filters, page);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const formatSalary = (job) => {
        if (
            job.salary_min == null &&
            job.salary_max == null
        ) {
            return "Salary not specified";
        }

        if (job.salary_min == null) {
            return `Up to ₹${Number(
                job.salary_max
            ).toLocaleString("en-IN")}`;
        }

        if (job.salary_max == null) {
            return `From ₹${Number(
                job.salary_min
            ).toLocaleString("en-IN")}`;
        }

        return `₹${Number(
            job.salary_min
        ).toLocaleString("en-IN")} - ₹${Number(
            job.salary_max
        ).toLocaleString("en-IN")}`;
    };

    const formatEmploymentType = (type) => {
        if (!type) {
            return "Not specified";
        }

        return type
            .split("_")
            .map(
                (word) =>
                    word.charAt(0).toUpperCase() +
                    word.slice(1)
            )
            .join(" ");
    };

    const formatExperienceLevel = (level) => {
        if (!level) {
            return "Not specified";
        }

        return (
            level.charAt(0).toUpperCase() +
            level.slice(1)
        );
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-7xl px-6 py-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Browse Jobs
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Find your next opportunity.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="mt-8 rounded-xl bg-white p-6 shadow-sm"
                >
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        <div className="lg:col-span-3">
                            <label
                                htmlFor="search"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Search
                            </label>

                            <input
                                id="search"
                                name="search"
                                type="text"
                                value={filters.search}
                                onChange={handleChange}
                                placeholder="Search by job title or description..."
                                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

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
                                value={filters.employmentType}
                                onChange={handleChange}
                                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">
                                    All Types
                                </option>
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
                                value={filters.experienceLevel}
                                onChange={handleChange}
                                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">
                                    All Levels
                                </option>
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

                        <div className="flex items-end">
                            <label className="flex items-center gap-3 pb-3">
                                <input
                                    type="checkbox"
                                    name="isRemote"
                                    checked={filters.isRemote}
                                    onChange={handleChange}
                                    className="h-4 w-4 rounded border-gray-300"
                                />

                                <span className="text-sm font-medium text-gray-700">
                                    Remote jobs only
                                </span>
                            </label>
                        </div>

                        <div>
                            <label
                                htmlFor="minSalary"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Minimum Salary
                            </label>

                            <input
                                id="minSalary"
                                name="minSalary"
                                type="number"
                                min="0"
                                value={filters.minSalary}
                                onChange={handleChange}
                                placeholder="400000"
                                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="maxSalary"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Maximum Salary
                            </label>

                            <input
                                id="maxSalary"
                                name="maxSalary"
                                type="number"
                                min="0"
                                value={filters.maxSalary}
                                onChange={handleChange}
                                placeholder="700000"
                                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="submit"
                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Search Jobs
                        </button>

                        <button
                            type="button"
                            onClick={handleClear}
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Clear Filters
                        </button>
                    </div>
                </form>

                {!loading &&
                    !error &&
                    jobs.length > 0 && (
                        <div className="mt-8 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Showing{" "}
                                {jobs.length} of{" "}
                                {pagination.total} jobs
                            </p>

                            <p className="text-sm text-gray-500">
                                Page{" "}
                                {pagination.page} of{" "}
                                {pagination.totalPages}
                            </p>
                        </div>
                    )}

                {loading && (
                    <div className="mt-8 flex justify-center">
                        <p className="text-gray-600">
                            Loading jobs...
                        </p>
                    </div>
                )}

                {!loading && error && (
                    <div className="mt-8 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                {!loading &&
                    !error &&
                    jobs.length === 0 && (
                        <div className="mt-8 rounded-xl bg-white p-8 text-center shadow-sm">
                            <p className="font-medium text-gray-700">
                                No jobs found
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                                Try changing your search or filters.
                            </p>
                        </div>
                    )}

                {!loading &&
                    !error &&
                    jobs.length > 0 && (
                        <div className="mt-6 grid gap-5">
                            {jobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                {job.title}
                                            </h2>

                                            <p className="mt-1 text-sm font-medium text-gray-600">
                                                {job.company_name}
                                            </p>
                                        </div>

                                        <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                                            {formatEmploymentType(
                                                job.employment_type
                                            )}
                                        </span>
                                    </div>

                                    <p className="mt-4 line-clamp-2 text-gray-600">
                                        {job.description}
                                    </p>

                                    <div className="mt-5 flex flex-wrap gap-4 text-sm text-gray-500">
                                        <span>
                                            📍{" "}
                                            {job.location ||
                                                "Location not specified"}
                                        </span>

                                        <span>
                                            💰{" "}
                                            {formatSalary(job)}
                                        </span>

                                        <span>
                                            🎓{" "}
                                            {formatExperienceLevel(
                                                job.experience_level
                                            )}
                                        </span>

                                        {job.is_remote && (
                                            <span className="font-medium text-green-600">
                                                🌐 Remote
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-xs text-gray-400">
                                            Posted{" "}
                                            {new Date(
                                                job.created_at
                                            ).toLocaleDateString(
                                                "en-IN"
                                            )}
                                        </p>

                                        <Link
                                            to={`/jobs/${job.id}`}
                                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                {!loading &&
                    !error &&
                    pagination.totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    handlePageChange(
                                        pagination.page - 1
                                    )
                                }
                                disabled={
                                    pagination.page === 1
                                }
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>

                            {Array.from(
                                {
                                    length:
                                        pagination.totalPages,
                                },
                                (_, index) => index + 1
                            ).map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() =>
                                        handlePageChange(page)
                                    }
                                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                                        page ===
                                        pagination.page
                                            ? "bg-blue-600 text-white"
                                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() =>
                                    handlePageChange(
                                        pagination.page + 1
                                    )
                                }
                                disabled={
                                    pagination.page ===
                                    pagination.totalPages
                                }
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
            </main>
        </div>
    );
}

export default Jobs;