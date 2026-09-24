import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Applications() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const response = await api.get("/jobs/applications/me");

                setApplications(response.data.data.applications);
            } catch (error) {
                console.error("Failed to fetch applications:", error);

                setError(
                    error.response?.data?.message ||
                        "Failed to load applications."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchApplications();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">Loading applications...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-5xl px-6 py-10">
                <Link
                    to="/"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to Dashboard
                </Link>

                <div className="mt-6">
                    <h1 className="text-3xl font-bold text-gray-900">
                        My Applications
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Track the jobs you have applied for.
                    </p>
                </div>

                {error && (
                    <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                {!error && applications.length === 0 && (
                    <div className="mt-8 rounded-xl bg-white p-8 text-center shadow-sm">
                        <p className="text-gray-500">
                            You haven't applied to any jobs yet.
                        </p>

                        <Link
                            to="/jobs"
                            className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Browse Jobs
                        </Link>
                    </div>
                )}

                <div className="mt-8 space-y-5">
                    {applications.map((application) => (
                        <div
                            key={application.id}
                            className="rounded-xl bg-white p-6 shadow-sm"
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {application.job_title}
                                    </h2>

                                    <p className="mt-1 text-gray-500">
                                        {application.company_name}
                                    </p>
                                </div>

                                <span
                                    className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${
                                        application.status === "accepted"
                                            ? "bg-green-50 text-green-700"
                                            : application.status === "rejected"
                                            ? "bg-red-50 text-red-700"
                                            : application.status ===
                                              "shortlisted"
                                            ? "bg-blue-50 text-blue-700"
                                            : "bg-yellow-50 text-yellow-700"
                                    }`}
                                >
                                    {application.status}
                                </span>
                            </div>

                            <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-3">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Location
                                    </p>

                                    <p className="mt-1 font-medium text-gray-900">
                                        {application.location ||
                                            "Not specified"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">
                                        Employment Type
                                    </p>

                                    <p className="mt-1 font-medium text-gray-900">
                                        {application.employment_type}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">
                                        Experience
                                    </p>

                                    <p className="mt-1 font-medium text-gray-900">
                                        {application.experience_level ||
                                            "Not specified"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Applied{" "}
                                    {new Date(
                                        application.applied_at
                                    ).toLocaleDateString("en-IN")}
                                </p>

                                <Link
                                    to={`/jobs/${application.job_id}`}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                >
                                    View Job →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default Applications;