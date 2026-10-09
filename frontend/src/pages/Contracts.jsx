import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
        return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
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

function Contracts() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;

        const fetchContracts = async () => {
            try {
                const response = await api.get("/contracts/me");

                if (mounted) {
                    setContracts(
                        response.data.data.contracts || []
                    );
                }
            } catch (requestError) {
                console.error(
                    "Failed to fetch contracts:",
                    requestError
                );

                if (mounted) {
                    setError(
                        requestError.response?.data?.message ||
                            "Failed to load contracts."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchContracts();

        return () => {
            mounted = false;
        };
    }, []);

    if (loading) {
        return (
            <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
                <p className="text-gray-600">Loading contracts...</p>
            </main>
        );
    }

    return (
        <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    My Contracts
                </h1>
                <p className="mt-2 text-gray-600">
                    View the agreements for your projects.
                </p>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            {!error && contracts.length === 0 && (
                <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900">
                        No contracts yet
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Contracts will appear here when a project proposal is
                        accepted.
                    </p>
                </div>
            )}

            {!error && contracts.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                    {contracts.map((contract) => (
                        <article
                            key={contract.id}
                            className="flex flex-col rounded-xl bg-white p-6 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {contract.project?.title || "Project"}
                                </h2>
                                <span
                                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                                        contract.status
                                    )}`}
                                >
                                    {contract.status}
                                </span>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        {user?.role === "client"
                                            ? "Freelancer"
                                            : user?.role === "freelancer"
                                            ? "Client"
                                            : "Participants"}
                                    </p>
                                    <p className="mt-1 font-medium text-gray-900">
                                        {user?.role === "client"
                                            ? contract.freelancer?.name ||
                                              "Not available"
                                            : user?.role === "freelancer"
                                            ? contract.client?.name ||
                                              "Not available"
                                            : `Client: ${
                                                  contract.client?.name ||
                                                  "Not available"
                                              } · Freelancer: ${
                                                  contract.freelancer?.name ||
                                                  "Not available"
                                              }`}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Agreed Amount
                                    </p>
                                    <p className="mt-1 font-semibold text-gray-900">
                                        {formatCurrency(
                                            contract.agreed_amount
                                        )}
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
                            </div>

                            <div className="mt-6 border-t pt-4">
                                <Link
                                    to={`/contracts/${contract.id}`}
                                    className="inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                    View Contract
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}

export default Contracts;
