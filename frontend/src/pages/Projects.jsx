import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function formatAmount(amount) {
    if (amount == null || amount === "") {
        return null;
    }

    return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function formatBudget(min, max) {
    const minimum = formatAmount(min);
    const maximum = formatAmount(max);

    if (minimum && maximum) {
        return `${minimum} - ${maximum}`;
    }

    if (minimum) {
        return `${minimum} - Negotiable`;
    }

    if (maximum) {
        return `Up to ${maximum}`;
    }

    return "Negotiable";
}

function formatStatus(status) {
    if (!status) {
        return "Not specified";
    }

    return status
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1)
        )
        .join(" ");
}

function getStatusClasses(status) {
    switch (status) {
        case "open":
            return "bg-green-100 text-green-700";

        case "in_progress":
            return "bg-blue-100 text-blue-700";

        case "completed":
            return "bg-purple-100 text-purple-700";

        case "cancelled":
            return "bg-red-100 text-red-700";

        case "draft":
            return "bg-gray-100 text-gray-700";

        default:
            return "bg-gray-100 text-gray-700";
    }
}

function Projects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await api.get("/projects");

                setProjects(
                    response.data.data.projects || []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch projects:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                        "Failed to load projects."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <main className="mx-auto max-w-7xl px-6 py-10">
                    <p className="text-gray-600">
                        Loading projects...
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-7xl px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Browse Projects
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Find freelance projects that match
                        your skills and experience.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                {!error && projects.length === 0 && (
                    <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900">
                            No projects available
                        </h2>

                        <p className="mt-2 text-gray-500">
                            There are currently no open
                            projects.
                        </p>
                    </div>
                )}

                {projects.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="flex flex-col rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {project.title}
                                    </h2>

                                    <span
                                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                            project.status
                                        )}`}
                                    >
                                        {formatStatus(
                                            project.status
                                        )}
                                    </span>
                                </div>

                                <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                                    {project.description}
                                </p>

                                <div className="mt-5">
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Budget
                                    </p>

                                    <p className="mt-1 font-semibold text-gray-900">
                                        {formatBudget(
                                            project.budget_min,
                                            project.budget_max
                                        )}
                                    </p>
                                </div>

                                <div className="mt-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Experience
                                    </p>

                                    <p className="mt-1 capitalize text-gray-800">
                                        {project.experience_level ||
                                            "Not specified"}
                                    </p>
                                </div>

                                {project.deadline && (
                                    <div className="mt-4">
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Deadline
                                        </p>

                                        <p className="mt-1 text-sm text-gray-800">
                                            {new Date(
                                                project.deadline
                                            ).toLocaleDateString(
                                                "en-IN",
                                                {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                }
                                            )}
                                        </p>
                                    </div>
                                )}

                                {project.skills &&
                                    project.skills.length > 0 && (
                                        <div className="mt-5">
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Skills
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                {project.skills.map(
                                                    (skill) => (
                                                        <span
                                                            key={
                                                                skill.id
                                                            }
                                                            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                                                        >
                                                            {
                                                                skill.name
                                                            }
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                <div className="mt-auto pt-6">
                                    <Link
                                        to={`/projects/${project.id}`}
                                        className="inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        View Project →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default Projects;