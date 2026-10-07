import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/useAuth";

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
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [acceptedProposal, setAcceptedProposal] =
        useState(null);

    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [submittingReview, setSubmittingReview] =
        useState(false);

    const [error, setError] = useState("");
    const [completeError, setCompleteError] = useState("");
    const [reviewError, setReviewError] = useState("");

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");

    useEffect(() => {
        const fetchProjectData = async () => {
            try {
                setLoading(true);
                setError("");

                const [
                    projectResponse,
                    reviewsResponse,
                ] = await Promise.all([
                    api.get(`/projects/${id}`),
                    api.get(`/projects/${id}/reviews`),
                ]);

                const projectData =
                    projectResponse.data.data.project;

                setProject(projectData);

                setReviews(
                    reviewsResponse.data.data.reviews || []
                );

                if (
                    user?.role === "client" ||
                    user?.role === "admin"
                ) {
                    const proposalsResponse =
                        await api.get(
                            `/projects/${id}/proposals`
                        );

                    const proposals =
                        proposalsResponse.data.data
                            .proposals || [];

                    const accepted = proposals.find(
                        (proposal) =>
                            proposal.status === "accepted"
                    );

                    setAcceptedProposal(
                        accepted || null
                    );
                } else if (user?.role === "freelancer") {
                    const proposalsResponse =
                        await api.get("/proposals/me");

                    const proposals =
                        proposalsResponse.data.data
                            .proposals || [];

                    const accepted = proposals.find(
                        (proposal) =>
                            Number(proposal.project_id) ===
                                Number(id) &&
                            proposal.status === "accepted"
                    );

                    setAcceptedProposal(
                        accepted || null
                    );
                }
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

        if (user) {
            fetchProjectData();
        }
    }, [id, user]);

    const handleCompleteProject = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to mark this project as completed?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setCompleting(true);
            setCompleteError("");

            const response = await api.patch(
                `/projects/${id}/complete`
            );

            const completedProject =
                response.data.data.project;

            setProject(completedProject);
        } catch (error) {
            console.error(
                "Failed to complete project:",
                error
            );

            setCompleteError(
                error.response?.data?.message ||
                    "Failed to complete the project."
            );
        } finally {
            setCompleting(false);
        }
    };

    const handleSubmitReview = async (event) => {
        event.preventDefault();

        if (!acceptedProposal) {
            setReviewError(
                "No accepted freelancer found for this project."
            );
            return;
        }

        if (!rating || rating < 1 || rating > 5) {
            setReviewError(
                "Please select a rating between 1 and 5."
            );
            return;
        }

        try {
            setSubmittingReview(true);
            setReviewError("");

            const revieweeId =
                Number(user.id) ===
                Number(project.client_id)
                    ? acceptedProposal.freelancer_id
                    : project.client_id;

            const response = await api.post(
                `/projects/${id}/reviews`,
                {
                    revieweeId,
                    rating,
                    comment: comment.trim(),
                }
            );

            const newReview =
                response.data.data.review;

            setReviews((currentReviews) => [
                newReview,
                ...currentReviews,
            ]);

            setRating(5);
            setComment("");
        } catch (error) {
            console.error(
                "Failed to submit review:",
                error
            );

            setReviewError(
                error.response?.data?.message ||
                    "Failed to submit review."
            );
        } finally {
            setSubmittingReview(false);
        }
    };

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

    const canCompleteProject =
        project.status === "in_progress" &&
        user &&
        (
            user.role === "admin" ||
            (
                user.role === "client" &&
                Number(project.client_id) === Number(user.id)
            )
        );

    const hasReviewed = reviews.some(
        (review) =>
            Number(review.reviewer_id) ===
            Number(user?.id)
    );

    const canReview =
        project.status === "completed" &&
        acceptedProposal &&
        (
            Number(user?.id) ===
                Number(project.client_id) ||
            Number(user?.id) ===
                Number(acceptedProposal.freelancer_id)
        ) &&
        !hasReviewed;

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

                    {canCompleteProject && (
                        <div className="border-b border-gray-200 py-8">
                            <h2 className="text-xl font-bold text-slate-900">
                                Project Management
                            </h2>

                            <p className="mt-2 text-slate-500">
                                The accepted freelancer has been assigned
                                to this project.
                            </p>

                            {completeError && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                                    {completeError}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleCompleteProject}
                                disabled={completing}
                                className="mt-5 inline-flex rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {completing
                                    ? "Completing Project..."
                                    : "✓ Mark Project as Completed"}
                            </button>
                        </div>
                    )}

                    {project.status === "completed" && (
                        <div className="border-b border-gray-200 py-8">
                            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                                <p className="font-semibold text-purple-800">
                                    ✓ Project Completed
                                </p>

                                <p className="mt-1 text-sm text-purple-700">
                                    This project has been completed.
                                    Participants can now leave reviews.
                                </p>
                            </div>
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

                        {canReview && (
                            <form
                                onSubmit={handleSubmitReview}
                                className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6"
                            >
                                <h3 className="text-lg font-bold text-slate-900">
                                    Leave a Review
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    Share your experience working on
                                    this project.
                                </p>

                                {reviewError && (
                                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        {reviewError}
                                    </div>
                                )}

                                <div className="mt-5">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Rating
                                    </label>

                                    <div className="mt-2 flex gap-2">
                                        {[1, 2, 3, 4, 5].map(
                                            (star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() =>
                                                        setRating(
                                                            star
                                                        )
                                                    }
                                                    className={`text-3xl transition ${
                                                        star <=
                                                        rating
                                                            ? "text-yellow-400"
                                                            : "text-gray-300"
                                                    }`}
                                                    aria-label={`${star} star`}
                                                >
                                                    ★
                                                </button>
                                            )
                                        )}
                                    </div>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {rating} / 5
                                    </p>
                                </div>

                                <div className="mt-5">
                                    <label
                                        htmlFor="review-comment"
                                        className="block text-sm font-semibold text-slate-700"
                                    >
                                        Comment
                                    </label>

                                    <textarea
                                        id="review-comment"
                                        value={comment}
                                        onChange={(event) =>
                                            setComment(
                                                event.target.value
                                            )
                                        }
                                        rows={4}
                                        maxLength={2000}
                                        placeholder="Share your experience..."
                                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />

                                    <p className="mt-1 text-right text-xs text-slate-400">
                                        {comment.length}/2000
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submittingReview
                                        ? "Submitting..."
                                        : "Submit Review"}
                                </button>
                            </form>
                        )}

                        {project.status === "completed" &&
                            hasReviewed && (
                                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
                                    <p className="font-semibold text-green-800">
                                        ✓ You have already reviewed this
                                        project participant.
                                    </p>
                                </div>
                            )}

                        {reviews.length === 0 ? (
                            <div className="mt-6 rounded-xl bg-gray-50 px-6 py-8 text-center">
                                <p className="font-semibold text-slate-700">
                                    No reviews yet
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                    Reviews will appear here after
                                    participants submit them.
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