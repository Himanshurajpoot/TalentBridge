import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function MyProjects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchMyProjects = async () => {
            try {
                const response = await api.get("/projects/my");

                setProjects(
                    response.data.data.projects || []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch my projects:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                        "Failed to load your projects."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchMyProjects();
    }, []);

    const formatBudget = (min, max) => {
        if (min == null && max == null) {
            return "Negotiable";
        }

        if (min != null && max != null) {
            return `₹${Number(min).toLocaleString(
                "en-IN"
            )} - ₹${Number(max).toLocaleString(
                "en-IN"
            )}`;
        }

        if (min != null) {
            return `From ₹${Number(min).toLocaleString(
                "en-IN"
            )}`;
        }

        return `Up to ₹${Number(max).toLocaleString(
            "en-IN"
        )}`;
    };

    const formatDate = (date) => {
        if (!date) {
            return "No deadline";
        }

        return new Date(date).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric",
            }
        );
    };

    const getStatusClasses = (status) => {
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
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <main className="mx-auto max-w-6xl px-6 py-10">
                    <p className="text-gray-600">
                        Loading your projects...
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-6xl px-6 py-10">

                {/* Header */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            My Projects
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Manage the projects you have
                            posted.
                        </p>
                    </div>

                    <Link
                        to="/create-project"
                        className="w-fit rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        + Create Project
                    </Link>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!error && projects.length === 0 && (
                    <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900">
                            No projects yet
                        </h2>

                        <p className="mt-2 text-gray-500">
                            Create your first project to start
                            receiving proposals.
                        </p>

                        <Link
                            to="/create-project"
                            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Create Project
                        </Link>
                    </div>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2">

                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="flex flex-col rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                            >

                                {/* Header */}
                                <div className="flex items-start justify-between gap-4">

                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {project.title}
                                    </h2>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                                            project.status
                                        )}`}
                                    >
                                        {project.status?.replace(
                                            "_",
                                            " "
                                        )}
                                    </span>

                                </div>

                                {/* Description */}
                                <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">
                                    {project.description}
                                </p>

                                {/* Details */}
                                <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2">

                                    <div>
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

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Experience
                                        </p>

                                        <p className="mt-1 capitalize font-semibold text-gray-900">
                                            {project.experience_level ||
                                                "Not specified"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Deadline
                                        </p>

                                        <p className="mt-1 font-semibold text-gray-900">
                                            {formatDate(
                                                project.deadline
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Proposals
                                        </p>

                                        <p className="mt-1 font-semibold text-gray-900">
                                            {project.proposal_count ??
                                                project.application_count ??
                                                0}
                                        </p>
                                    </div>

                                </div>

                                {/* Actions */}
                                <div className="mt-auto flex flex-wrap gap-4 pt-6">

                                    <Link
                                        to={`/projects/${project.id}`}
                                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        View Project
                                    </Link>

                                    <Link
                                        to={`/projects/${project.id}/proposals`}
                                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                                    >
                                        View Proposals
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

export default MyProjects;