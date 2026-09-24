import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

function JobApplications() {
    const { jobId } = useParams();

    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const response = await api.get(
                    `/jobs/${jobId}/applications`
                );

                setApplications(response.data.data.applications);
            } catch (error) {
                console.error(
                    "Failed to fetch job applications:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                        "Failed to load applications."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchApplications();
    }, [jobId]);

    const updateStatus = async (applicationId, status) => {
        setError("");
        setUpdatingId(applicationId);

        try {
            const response = await api.patch(
                `/jobs/${jobId}/applications/${applicationId}`,
                {
                    status,
                }
            );

            const updatedApplication =
                response.data.data.application;

            setApplications((currentApplications) =>
                currentApplications.map((application) =>
                    application.id === applicationId
                        ? {
                              ...application,
                              status: updatedApplication.status,
                          }
                        : application
                )
            );
        } catch (error) {
            console.error(
                "Failed to update application status:",
                error
            );

            setError(
                error.response?.data?.message ||
                    "Failed to update application status."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">
                    Loading applications...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-5xl px-6 py-10">
                <Link
                    to="/my-jobs"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to My Jobs
                </Link>

                <div className="mt-6">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Job Applications
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Review and manage applications submitted
                        for this job.
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
                            No applications have been submitted yet.
                        </p>
                    </div>
                )}

                <div className="mt-8 space-y-6">
                    {applications.map((application) => (
                        <div
                            key={application.id}
                            className="rounded-xl bg-white p-6 shadow-sm"
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {application.applicant_name}
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {application.applicant_email}
                                    </p>
                                </div>

                                <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-medium capitalize text-blue-700">
                                    {application.status}
                                </span>
                            </div>

                            <div className="mt-6 border-t pt-6">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Cover Letter
                                </h3>

                                <p className="mt-2 leading-7 text-gray-600">
                                    {application.cover_letter}
                                </p>
                            </div>

                            {application.resume_url && (
                                <div className="mt-5">
                                    <a
                                        href={application.resume_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                    >
                                        View Resume →
                                    </a>
                                </div>
                            )}

                            <div className="mt-6 border-t pt-6">
                                <label
                                    htmlFor={`status-${application.id}`}
                                    className="block text-sm font-semibold text-gray-900"
                                >
                                    Application Status
                                </label>

                                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                                    <select
                                        id={`status-${application.id}`}
                                        value={application.status}
                                        disabled={
                                            updatingId ===
                                            application.id
                                        }
                                        onChange={(event) =>
                                            updateStatus(
                                                application.id,
                                                event.target.value
                                            )
                                        }
                                        className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                                    >
                                        <option value="pending">
                                            Pending
                                        </option>

                                        <option value="reviewing">
                                            Reviewing
                                        </option>

                                        <option value="shortlisted">
                                            Shortlisted
                                        </option>

                                        <option value="accepted">
                                            Accepted
                                        </option>

                                        <option value="rejected">
                                            Rejected
                                        </option>
                                    </select>

                                    {updatingId ===
                                        application.id && (
                                        <p className="self-center text-sm text-gray-500">
                                            Updating...
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 border-t pt-5">
                                <p className="text-sm text-gray-500">
                                    Applied{" "}
                                    {new Date(
                                        application.applied_at
                                    ).toLocaleDateString(
                                        "en-IN"
                                    )}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default JobApplications;
