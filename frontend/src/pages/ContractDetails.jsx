import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/useAuth";

function formatCurrency(value) {
    if (value === null || value === undefined) {
        return "Not specified";
    }

    return `₹${Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatDate(value) {
    if (!value) {
        return "Not specified";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not specified";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatStatus(value) {
    if (!value) {
        return "Not available";
    }

    return value
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(" ");
}

function getStatusClasses(status) {
    switch (status) {
        case "active":
            return "bg-green-100 text-green-700";

        case "completed":
            return "bg-blue-100 text-blue-700";

        case "cancelled":
            return "bg-gray-100 text-gray-700";

        default:
            return "bg-gray-100 text-gray-700";
    }
}

function ContractDetails() {
    const { contractId } = useParams();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [completionError, setCompletionError] = useState("");
    const [completionSuccess, setCompletionSuccess] = useState("");
    const [errorStatus, setErrorStatus] = useState(null);
    const [error, setError] = useState("");

    const canCompleteContract =
        contract?.status === "active" &&
        user?.role !== "admin" &&
        (Number(contract?.client_id) === Number(user?.id) ||
            Number(contract?.freelancer_id) === Number(user?.id));

    useEffect(() => {
        let mounted = true;

        const fetchContract = async () => {
            setLoading(true);
            setError("");
            setErrorStatus(null);

            try {
                const response = await api.get(
                    `/contracts/${contractId}`
                );

                if (mounted) {
                    setContract(response.data.data.contract);
                }
            } catch (requestError) {
                console.error(
                    "Failed to fetch contract:",
                    requestError
                );

                if (mounted) {
                    setErrorStatus(requestError.response?.status);
                    setError(
                        requestError.response?.data?.message ||
                            "Failed to load contract."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchContract();

        return () => {
            mounted = false;
        };
    }, [contractId]);

    const handleCompleteContract = async () => {
        if (completing) {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to mark this contract as completed?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setCompleting(true);
            setCompletionError("");
            setCompletionSuccess("");

            const response = await api.patch(
                `/contracts/${contractId}/complete`
            );

            setContract((currentContract) => ({
                ...currentContract,
                ...response.data.data.contract,
            }));
            setCompletionSuccess(
                "Contract completed successfully."
            );
        } catch (requestError) {
            console.error(
                "Failed to complete contract:",
                requestError
            );

            const status = requestError.response?.status;
            const message =
                status === 401
                    ? "Please sign in again to complete this contract."
                    : status === 403
                    ? "You do not have permission to complete this contract."
                    : status === 404
                    ? "This contract could not be found."
                    : status === 409
                    ? "This contract is no longer active or has already been completed."
                    : "Failed to complete the contract. Please try again.";

            setCompletionError(message);

            if (status === 404) {
                setErrorStatus(404);
                setContract(null);
            }
        } finally {
            setCompleting(false);
        }
    };

    if (loading) {
        return (
            <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
                <p className="text-gray-600">Loading contract...</p>
            </main>
        );
    }

    if (errorStatus === 404) {
        return (
            <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
                <Link
                    to="/contracts"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to Contracts
                </Link>
                <div className="mt-6 rounded-xl bg-white p-8 text-center shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Contract not found
                    </h1>
                    <p className="mt-2 text-gray-600">
                        This contract may have been removed or the address may
                        be incorrect.
                    </p>
                </div>
            </main>
        );
    }

    if (errorStatus === 403) {
        return (
            <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
                <Link
                    to="/contracts"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to Contracts
                </Link>
                <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
                    You do not have permission to view this contract.
                </div>
            </main>
        );
    }

    if (error || !contract) {
        return (
            <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
                <Link
                    to="/contracts"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to Contracts
                </Link>
                <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
                    {error || "Failed to load contract."}
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
            <Link
                to="/contracts"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
                ← Back to Contracts
            </Link>

            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">
                            Contract
                        </p>
                        <h1 className="mt-1 text-3xl font-bold text-gray-900">
                            {contract.project?.title || "Project"}
                        </h1>
                    </div>
                    <span
                        className={`w-fit rounded-full px-3 py-1 text-sm font-semibold capitalize ${getStatusClasses(
                            contract.status
                        )}`}
                    >
                        {contract.status}
                    </span>
                </div>

                {completionSuccess && (
                    <div className="mt-5 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">
                        {completionSuccess}
                    </div>
                )}

                {completionError && (
                    <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {completionError}
                    </div>
                )}

                <section className="mt-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Project Details
                    </h2>
                    <p className="mt-2 whitespace-pre-line leading-7 text-gray-600">
                        {contract.project?.description ||
                            "No project description provided."}
                    </p>
                    <p className="mt-3 text-sm text-gray-600">
                        Project status:{" "}
                        <span className="font-medium text-gray-900">
                            {formatStatus(contract.project?.status)}
                        </span>
                    </p>
                </section>

                <section className="mt-8 grid gap-5 border-t pt-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Client
                        </p>
                        <p className="mt-1 font-medium text-gray-900">
                            {contract.client?.name || "Not available"}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Freelancer
                        </p>
                        <p className="mt-1 font-medium text-gray-900">
                            {contract.freelancer?.name || "Not available"}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Agreed Amount
                        </p>
                        <p className="mt-1 font-semibold text-gray-900">
                            {formatCurrency(contract.agreed_amount)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Start Date
                        </p>
                        <p className="mt-1 text-gray-900">
                            {formatDate(contract.start_date)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            End Date
                        </p>
                        <p className="mt-1 text-gray-900">
                            {formatDate(contract.end_date)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Created
                        </p>
                        <p className="mt-1 text-gray-900">
                            {formatDate(contract.created_at)}
                        </p>
                    </div>
                </section>

                <section className="mt-8 border-t pt-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Contract Terms
                    </h2>
                    <p className="mt-3 whitespace-pre-line leading-7 text-gray-600">
                        {contract.terms || "No terms provided."}
                    </p>
                </section>

                {canCompleteContract && (
                    <div className="mt-8 border-t pt-6">
                        <button
                            type="button"
                            onClick={handleCompleteContract}
                            disabled={completing}
                            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {completing
                                ? "Completing..."
                                : "Complete Contract"}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

export default ContractDetails;
