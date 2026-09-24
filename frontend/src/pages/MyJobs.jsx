import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function MyJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchMyJobs = async () => {
            try {
                const response = await api.get("/jobs/my");

                setJobs(response.data.data.jobs);
            } catch (error) {
                console.error("Failed to fetch my jobs:", error);

                setError(
                    error.response?.data?.message ||
                        "Failed to load your jobs."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchMyJobs();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">Loading your jobs...</p>
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
                        My Jobs
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Manage the jobs you have posted.
                    </p>
                </div>

                {error && (
                    <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                {!error && jobs.length === 0 && (
                    <div className="mt-8 rounded-xl bg-white p-8 text-center shadow-sm">
                        <p className="text-gray-500">
                            You haven't posted any jobs yet.
                        </p>
                    </div>
                )}

                <div className="mt-8 space-y-5">
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            className="rounded-xl bg-white p-6 shadow-sm"
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {job.title}
                                    </h2>

                                    <p className="mt-1 text-gray-500">
                                        {job.company_name}
                                    </p>
                                </div>

                                <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-sm font-medium capitalize text-green-700">
                                    {job.status}
                                </span>
                            </div>

                            <p className="mt-4 text-gray-600">
                                {job.description}
                            </p>

                            <div className="mt-5 flex flex-wrap gap-4 text-sm text-gray-500">
                                <span>
                                    📍 {job.location || "Not specified"}
                                </span>

                                <span>
                                    💼 {job.employment_type}
                                </span>

                                <span>
                                    👥 {job.application_count} applications
                                </span>
                            </div>

                            <Link
                                to={`/jobs/${job.id}/applications`}
                                className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                View Applications →
                            </Link>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default MyJobs;