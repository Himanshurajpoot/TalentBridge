import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

function formatStatus(status) {
    if (!status) {
        return "";
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
            return "bg-blue-100 text-blue-700";

        case "in_progress":
            return "bg-green-100 text-green-700";

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

function formatCurrency(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    return `₹${Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 0,
    })}`;
}

function formatDate(value) {
    if (!value) {
        return "Not specified";
    }

    return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatRating(rating) {
    return Number(rating).toFixed(1);
}

function ProjectDetails() {
    const { id } = useParams();

    const [project, setProject] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProjectData = async () => {
            try {
                setLoading(true);
                setError("");

                const [projectResponse, reviewsResponse] =
                    await Promise.all([
                        api.get(`/projects/${id}`),
                        api.get(`/projects/${id}/reviews`),
                    ]);

                setProject(
                    projectResponse.data.data.project
                );

                setReviews(
                    reviewsResponse.data.data.reviews || []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch project details:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                        "Failed to load project details."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProjectData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 px-6 py-10">
                <div className="mx-auto max-w-5xl">
                    <p className="text-gray-600">
                        Loading project...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 px-6 py-10">
                <div className="mx-auto max-w-5xl">
                    <Link
                        to="/projects"
                        className="font-medium text-blue-600 hover:text-blue-700"
                    >
                        ← Back to Projects
                    </Link>

                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gray-100 px-6 py-10">
                <div className="mx-auto max-w-5xl">
                    <Link
                        to="/projects"
                        className="font-medium text-blue-600 hover:text-blue-700"
                    >
                        ← Back to Projects
                    </Link>

                    <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
                        Project not found.
                    </div>
                </div>
            </div>
        );
    }

    const minimumBudget = formatCurrency(
        project.budget_min
    );

    const maximumBudget = formatCurrency(
        project.budget_max
    );

    let budget = "Not specified";

    if (minimumBudget && maximumBudget) {
        budget = `${minimumBudget} - ${maximumBudget}`;
    } else if (minimumBudget) {
        budget = `From ${minimumBudget}`;
    } else if (maximumBudget) {
        budget = `Up to ${maximumBudget}`;
    }

    return (
        <div className="min-h-screen bg-gray-100 px-6 py-10">
            <div className="mx-auto max-w-5xl">
                <Link
                    to="/projects"
                    className="font-medium text-blue-600 hover:text-blue-700"
                >
                    ← Back to Projects
                </Link>

                <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
                    <div className="flex flex-col gap-5 border-b border-gray-200 pb-8 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                {project.title}
                            </h1>

                            <p className="mt-3 text-lg text-slate-500">
                                Posted by Client
                            </p>
                        </div>

                        <span
                            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClasses(
                                project.status
                            )}`}
                        >
                            {formatStatus(project.status)}
                        </span>
                    </div>

                    <div className="border-b border-gray-200 py-8">
                        <h2 className="text-xl font-bold text-slate-900">
                            Project Description
                        </h2>

                        <p className="mt-4 leading-7 text-slate-600">
                            {project.description}
                        </p>
                    </div>

                    <div className="grid gap-8 border-b border-gray-200 py-8 md:grid-cols-2">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Budget
                            </p>

                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                {budget}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Experience Level
                            </p>

                            <p className="mt-2 text-lg font-semibold capitalize text-slate-900">
                                {project.experience_level
                                    ? project.experience_level.replace(
                                          "_",
                                          " "
                                      )
                                    : "Not specified"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Deadline
                            </p>

                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                {formatDate(
                                    project.deadline
                                )}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Posted
                            </p>

                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                {formatDate(
                                    project.created_at
                                )}
                            </p>
                        </div>
                    </div>

                    {project.skills &&
                        project.skills.length > 0 && (
                            <div className="border-b border-gray-200 py-8">
                                <h2 className="text-xl font-bold text-slate-900">
                                    Required Skills
                                </h2>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {project.skills.map(
                                        (skill) => (
                                            <span
                                                key={
                                                    skill.id ||
                                                    skill.name
                                                }
                                                className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
                                            >
                                                {skill.name}
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                    {project.status === "open" && (
                        <div className="border-b border-gray-200 py-8">
                            <Link
                                to={`/projects/${project.id}/proposal`}
                                className="inline-flex rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                            >
                                Submit Proposal →
                            </Link>
                        </div>
                    )}

                    <div className="pt-8">
                        <h2 className="text-xl font-bold text-slate-900">
                            Reviews
                        </h2>

                        <p className="mt-2 text-slate-500">
                            Feedback from people who worked on this
                            project.
                        </p>

                        {reviews.length === 0 ? (
                            <div className="mt-6 rounded-xl bg-gray-50 px-6 py-8 text-center">
                                <p className="font-semibold text-slate-700">
                                    No reviews yet
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                    Reviews will appear here after
                                    the project is completed.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4">
                                {reviews.map((review) => (
                                    <div
                                        key={review.id}
                                        className="rounded-xl border border-slate-200 bg-white p-5"
                                    >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {review.reviewer_name ||
                                                        "User"}
                                                </p>

                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="font-semibold text-yellow-500">
                                                        ★
                                                    </span>

                                                    <span className="text-sm font-medium text-slate-700">
                                                        {formatRating(
                                                            review.rating
                                                        )}{" "}
                                                        / 5
                                                    </span>
                                                </div>
                                            </div>

                                            <span className="text-sm text-slate-400">
                                                {formatDate(
                                                    review.created_at
                                                )}
                                            </span>
                                        </div>

                                        {review.comment && (
                                            <p className="mt-4 leading-6 text-slate-600">
                                                {review.comment}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProjectDetails;