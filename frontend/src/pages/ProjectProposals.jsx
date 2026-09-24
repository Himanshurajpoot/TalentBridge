import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function ProjectProposals() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [messagingId, setMessagingId] = useState(null);

    const fetchProposals = useCallback(async () => {
        try {
            setError("");

            const response = await api.get(
                `/projects/${projectId}/proposals`
            );

            setProposals(
                response.data.data.proposals || []
            );
        } catch (error) {
            console.error(
                "Failed to load proposals:",
                error
            );

            setError(
                error.response?.data?.message ||
                    "Failed to load proposals."
            );
        }
    }, [projectId]);

    useEffect(() => {
        const loadProposals = async () => {
            try {
                setLoading(true);
                await fetchProposals();
            } finally {
                setLoading(false);
            }
        };

        loadProposals();
    }, [fetchProposals]);

    const updateStatus = async (proposalId, status) => {
        const actionText =
            status === "accepted"
                ? "accept"
                : status === "rejected"
                ? "reject"
                : "shortlist";

        const confirmed = window.confirm(
            `Are you sure you want to ${actionText} this proposal?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setUpdatingId(proposalId);
            setError("");

            await api.patch(
                `/projects/${projectId}/proposals/${proposalId}/status`,
                {
                    status,
                }
            );

            await fetchProposals();
        } catch (error) {
            console.error(
                "Failed to update proposal:",
                error
            );

            setError(
                error.response?.data?.message ||
                    "Failed to update proposal status."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    const startConversation = async (freelancerId) => {
        try {
            setMessagingId(freelancerId);
            setError("");

            const response = await api.post(
                "/conversations",
                {
                    userId: freelancerId,
                }
            );

            const conversationId =
                response.data.data.conversationId;

            navigate("/messages", {
                state: {
                    conversationId,
                },
            });
        } catch (error) {
            console.error(
                "Failed to start conversation:",
                error
            );

            setError(
                error.response?.data?.message ||
                    "Failed to start conversation."
            );
        } finally {
            setMessagingId(null);
        }
    };

    const formatBudget = (budget) => {
        if (budget == null || budget === "") {
            return "Not specified";
        }

        return `₹${Number(budget).toLocaleString(
            "en-IN"
        )}`;
    };

    const formatDate = (date) => {
        if (!date) {
            return "Unknown";
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

    const formatStatus = (status) => {
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
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case "accepted":
                return "bg-green-100 text-green-700";

            case "rejected":
                return "bg-red-100 text-red-700";

            case "shortlisted":
                return "bg-blue-100 text-blue-700";

            case "withdrawn":
                return "bg-gray-100 text-gray-700";

            case "pending":
            default:
                return "bg-yellow-100 text-yellow-700";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <main className="mx-auto max-w-6xl px-6 py-10">
                    <p className="text-gray-600">
                        Loading proposals...
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-6xl px-6 py-10">
                <button
                    type="button"
                    onClick={() =>
                        navigate("/my-projects")
                    }
                    className="mb-6 text-sm font-semibold text-blue-600 hover:text-blue-800"
                >
                    ← Back to My Projects
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Project Proposals
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Review freelancers who applied to
                        your project.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                {!error && proposals.length === 0 && (
                    <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900">
                            No proposals yet
                        </h2>

                        <p className="mt-2 text-gray-500">
                            Freelancers have not submitted
                            any proposals for this project yet.
                        </p>
                    </div>
                )}

                {proposals.length > 0 && (
                    <div className="space-y-6">
                        {proposals.map((proposal) => (
                            <div
                                key={proposal.id}
                                className="rounded-xl bg-white p-6 shadow-sm"
                            >
                                <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {
                                                proposal.freelancer_name
                                            }
                                        </h2>

                                        <p className="mt-1 text-sm text-gray-500">
                                            {
                                                proposal.freelancer_email
                                            }
                                        </p>
                                    </div>

                                    <span
                                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                            proposal.status
                                        )}`}
                                    >
                                        {formatStatus(
                                            proposal.status
                                        )}
                                    </span>
                                </div>

                                <div className="grid gap-6 border-b py-6 sm:grid-cols-3">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Proposed Budget
                                        </p>

                                        <p className="mt-1 text-lg font-semibold text-gray-900">
                                            {formatBudget(
                                                proposal.proposed_budget
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Estimated Time
                                        </p>

                                        <p className="mt-1 text-lg font-semibold text-gray-900">
                                            {proposal.estimated_days ??
                                                "Not specified"}{" "}
                                            {proposal.estimated_days
                                                ? "days"
                                                : ""}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Submitted
                                        </p>

                                        <p className="mt-1 text-lg font-semibold text-gray-900">
                                            {formatDate(
                                                proposal.created_at
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="py-6">
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Cover Letter
                                    </p>

                                    <p className="mt-3 whitespace-pre-line leading-7 text-gray-700">
                                        {
                                            proposal.cover_letter
                                        }
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3 border-t pt-5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            startConversation(
                                                proposal.freelancer_id
                                            )
                                        }
                                        disabled={
                                            messagingId ===
                                            proposal.freelancer_id
                                        }
                                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {messagingId ===
                                        proposal.freelancer_id
                                            ? "Opening..."
                                            : "Message"}
                                    </button>

                                    {proposal.status !==
                                        "accepted" &&
                                        proposal.status !==
                                            "rejected" &&
                                        proposal.status !==
                                            "withdrawn" && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateStatus(
                                                            proposal.id,
                                                            "shortlisted"
                                                        )
                                                    }
                                                    disabled={
                                                        updatingId ===
                                                        proposal.id
                                                    }
                                                    className="rounded-lg border border-blue-300 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {updatingId ===
                                                    proposal.id
                                                        ? "Updating..."
                                                        : "Shortlist"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateStatus(
                                                            proposal.id,
                                                            "accepted"
                                                        )
                                                    }
                                                    disabled={
                                                        updatingId ===
                                                        proposal.id
                                                    }
                                                    className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {updatingId ===
                                                    proposal.id
                                                        ? "Updating..."
                                                        : "Accept"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateStatus(
                                                            proposal.id,
                                                            "rejected"
                                                        )
                                                    }
                                                    disabled={
                                                        updatingId ===
                                                        proposal.id
                                                    }
                                                    className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {updatingId ===
                                                    proposal.id
                                                        ? "Updating..."
                                                        : "Reject"}
                                                </button>
                                            </>
                                        )}

                                    {proposal.status ===
                                        "accepted" && (
                                        <span className="rounded-lg bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">
                                            ✓ Proposal Accepted
                                        </span>
                                    )}

                                    {proposal.status ===
                                        "rejected" && (
                                        <span className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
                                            Proposal Rejected
                                        </span>
                                    )}

                                    {proposal.status ===
                                        "shortlisted" && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateStatus(
                                                        proposal.id,
                                                        "accepted"
                                                    )
                                                }
                                                disabled={
                                                    updatingId ===
                                                    proposal.id
                                                }
                                                className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {updatingId ===
                                                proposal.id
                                                    ? "Updating..."
                                                    : "Accept"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateStatus(
                                                        proposal.id,
                                                        "rejected"
                                                    )
                                                }
                                                disabled={
                                                    updatingId ===
                                                    proposal.id
                                                }
                                                className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {updatingId ===
                                                proposal.id
                                                    ? "Updating..."
                                                    : "Reject"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default ProjectProposals;