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

function getPaymentStatusClasses(status) {
    switch (status) {
        case "funded":
            return "bg-green-100 text-green-700";

        case "funding_pending":
            return "bg-amber-100 text-amber-700";

        case "failed":
        case "refunded":
        case "cancelled":
        case "disputed":
            return "bg-red-100 text-red-700";

        default:
            return "bg-gray-100 text-gray-700";
    }
}

function loadRazorpayCheckout() {
    if (window.Razorpay) {
        return Promise.resolve(true);
    }

    const existingScript = document.querySelector(
        'script[src*="checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
        return new Promise((resolve) => {
            existingScript.addEventListener(
                "load",
                () => resolve(Boolean(window.Razorpay)),
                { once: true }
            );
            existingScript.addEventListener(
                "error",
                () => resolve(false),
                { once: true }
            );
        });
    }

    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.dataset.razorpayCheckout = "true";
        script.onload = () => resolve(Boolean(window.Razorpay));
        script.onerror = () => {
            script.remove();
            resolve(false);
        };
        document.body.appendChild(script);
    });
}

function ContractDetails() {
    const { contractId } = useParams();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [completionError, setCompletionError] = useState("");
    const [completionSuccess, setCompletionSuccess] = useState("");
    const [creatingPaymentOrder, setCreatingPaymentOrder] =
        useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [paymentMessage, setPaymentMessage] = useState("");
    const [errorStatus, setErrorStatus] = useState(null);
    const [error, setError] = useState("");

    const canCompleteContract =
        contract?.status === "active" &&
        user?.role !== "admin" &&
        (Number(contract?.client_id) === Number(user?.id) ||
            Number(contract?.freelancer_id) === Number(user?.id));

    const canInitiatePayment =
        contract?.status === "active" &&
        user?.role === "client" &&
        Number(contract?.client_id) === Number(user?.id);

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
                    setPayment(response.data.data.payment ?? null);
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

    const handlePay = async () => {
        if (creatingPaymentOrder || checkoutOpen) {
            return;
        }

        try {
            setCreatingPaymentOrder(true);
            setPaymentError("");
            setPaymentMessage("");

            const idempotencyKey = window.crypto.randomUUID
                ? window.crypto.randomUUID()
                : Array.from(
                      window.crypto.getRandomValues(new Uint8Array(16)),
                      (byte) => byte.toString(16).padStart(2, "0")
                  ).join("");

            const response = await api.post(
                `/contracts/${contractId}/payment-orders`,
                {},
                {
                    headers: {
                        "Idempotency-Key": idempotencyKey,
                    },
                }
            );

            const {
                razorpayOrderId,
                amount,
                currency,
                keyId,
            } = response.data.data;

            const checkoutLoaded = await loadRazorpayCheckout();

            if (!checkoutLoaded) {
                setPaymentError(
                    "Unable to load secure payment checkout. Please try again."
                );
                return;
            }

            let checkoutSucceeded = false;
            const checkout = new window.Razorpay({
                key: keyId,
                amount,
                currency,
                order_id: razorpayOrderId,
                name: "TalentBridge",
                description: contract.project?.title || "Contract payment",
                handler: async (checkoutResponse) => {
                    checkoutSucceeded = true;
                    setCheckoutOpen(false);

                    try {
                        const verificationResponse = await api.post(
                            "/contracts/payment-verifications/razorpay",
                            {
                                razorpay_order_id:
                                    checkoutResponse.razorpay_order_id,
                                razorpay_payment_id:
                                    checkoutResponse.razorpay_payment_id,
                                razorpay_signature:
                                    checkoutResponse.razorpay_signature,
                            }
                        );

                        setPaymentMessage(
                            verificationResponse.data.message
                        );
                    } catch (verificationError) {
                        console.error(
                            "Failed to verify payment signature:",
                            verificationError
                        );

                        setPaymentError(
                            verificationError.response?.status === 409
                                ? "This payment has already been associated with another transaction."
                                : "Payment could not be verified. No payment status has been confirmed."
                        );
                    }
                },
                modal: {
                    ondismiss: () => {
                        setCheckoutOpen(false);
                        if (!checkoutSucceeded) {
                            setPaymentMessage(
                                "Payment checkout was closed. No payment status has been confirmed."
                            );
                        }
                    },
                },
            });

            checkout.on("payment.failed", () => {
                setPaymentError(
                    "The payment attempt was not completed. Payment status has not been changed."
                );
            });
            setCheckoutOpen(true);
            checkout.open();
        } catch (requestError) {
            setCheckoutOpen(false);
            console.error(
                "Failed to start contract payment:",
                requestError
            );

            const status = requestError.response?.status;
            setPaymentError(
                status === 401
                    ? "Please sign in again to make this payment."
                    : status === 403
                    ? "Only the client on this contract can initiate payment."
                    : status === 404
                    ? "This contract could not be found."
                    : status === 409
                    ? requestError.response?.data?.message ||
                      "A payment order already exists or this contract is not eligible."
                    : status === 503
                    ? "Payment checkout is not configured right now."
                    : "Unable to start payment. Please try again."
            );
        } finally {
            setCreatingPaymentOrder(false);
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

                {paymentError && (
                    <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {paymentError}
                    </div>
                )}

                {paymentMessage && (
                    <div className="mt-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                        {paymentMessage}
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
                        Payment
                    </h2>
                    {!payment ? (
                        <p className="mt-3 text-gray-600">
                            No payment has been initiated.
                        </p>
                    ) : (
                        <div className="mt-4 grid gap-5 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Amount
                                </p>
                                <p className="mt-1 font-semibold text-gray-900">
                                    {formatCurrency(payment.amount)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Provider
                                </p>
                                <p className="mt-1 text-gray-900">
                                    {formatStatus(payment.provider)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Status
                                </p>
                                <span
                                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getPaymentStatusClasses(
                                        payment.status
                                    )}`}
                                >
                                    {formatStatus(payment.status)}
                                </span>
                            </div>
                            {payment.provider_order_reference && (
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Razorpay Order ID
                                    </p>
                                    <p className="mt-1 break-all text-sm text-gray-900">
                                        {payment.provider_order_reference}
                                    </p>
                                </div>
                            )}
                            {payment.provider_payment_reference && (
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Razorpay Payment ID
                                    </p>
                                    <p className="mt-1 break-all text-sm text-gray-900">
                                        {payment.provider_payment_reference}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <section className="mt-8 border-t pt-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Contract Terms
                    </h2>
                    <p className="mt-3 whitespace-pre-line leading-7 text-gray-600">
                        {contract.terms || "No terms provided."}
                    </p>
                </section>

                {(canCompleteContract || canInitiatePayment) && (
                    <div className="mt-8 border-t pt-6">
                        <div className="flex flex-wrap gap-3">
                            {canInitiatePayment && (
                                <button
                                    type="button"
                                    onClick={handlePay}
                                    disabled={
                                        creatingPaymentOrder || checkoutOpen
                                    }
                                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {creatingPaymentOrder
                                        ? "Preparing Checkout..."
                                        : checkoutOpen
                                        ? "Checkout Open"
                                        : "Pay"}
                                </button>
                            )}

                            {canCompleteContract && (
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
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

export default ContractDetails;
