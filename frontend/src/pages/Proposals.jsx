import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Proposals() {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProposals = async () => {
            try {
                const response = await api.get(
                    "/proposals/me"
                );

                setProposals(
                    response.data.data.proposals || []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch proposals:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                        "Failed to load proposals."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProposals();
    }, []);

    const formatBudget = (budget) => {
        if (budget == null) {
            return "Not specified";
        }

        return `₹${Number(budget).toLocaleString("en-IN")}`;
    };

    const formatDate = (date) => {
        if (!date) {
            return "Not available";
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
                <main className="mx-auto max-w-5xl px-6 py-10">
                    <p className="text-gray-600">
                        Loading proposals...
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-5xl px-6 py-10">

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        My Proposals
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Track the proposals you have submitted
                        to clients.
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
                            Browse projects and submit your
                            first proposal.
                        </p>

                        <Link
                            to="/projects"
                            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Browse Projects
                        </Link>
                    </div>
                )}

                {proposals.length > 0 && (
                    <div className="space-y-5">

                        {proposals.map((proposal) => (
                            <div
                                key={proposal.id}
                                className="rounded-xl bg-white p-6 shadow-sm"
                            >
                                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            {proposal.project_title ||
                                                "Project"}
                                        </h2>

                                        {proposal.company_name && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                {
                                                    proposal.company_name
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <span
                                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                                            proposal.status
                                        )}`}
                                    >
                                        {proposal.status}
                                    </span>
                                </div>

                                <div className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-3">

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Proposed Budget
                                        </p>

                                        <p className="mt-1 font-semibold text-gray-900">
                                            {formatBudget(
                                                proposal.proposed_budget
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Estimated Days
                                        </p>

                                        <p className="mt-1 font-semibold text-gray-900">
                                            {proposal.estimated_days !=
                                            null
                                                ? `${proposal.estimated_days} days`
                                                : "Not specified"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Submitted
                                        </p>

                                        <p className="mt-1 font-semibold text-gray-900">
                                            {formatDate(
                                                proposal.created_at
                                            )}
                                        </p>
                                    </div>

                                </div>

                                {proposal.cover_letter && (
                                    <div className="mt-6 border-t pt-5">
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Cover Letter
                                        </p>

                                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                                            {
                                                proposal.cover_letter
                                            }
                                        </p>
                                    </div>
                                )}

                                {proposal.project_id && (
                                    <div className="mt-6">
                                        <Link
                                            to={`/projects/${proposal.project_id}`}
                                            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                        >
                                            View Project →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}

                    </div>
                )}

            </main>
        </div>
    );
}

export default Proposals;