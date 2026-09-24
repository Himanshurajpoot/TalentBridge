import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import ApplicationForm from "../components/ApplicationForm";

function JobDetails() {
    const { id } = useParams();

    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const response = await api.get(`/jobs/${id}`);

                setJob(response.data.data.job);
            } catch (error) {
                console.error("Failed to fetch job:", error);

                setError(
                    error.response?.data?.message ||
                        "Failed to load job details."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">Loading job...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 px-6 py-10">
                <div className="mx-auto max-w-4xl rounded-xl bg-red-50 p-6 text-red-600">
                    {error}
                </div>
            </div>
        );
    }

    if (!job) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-4xl px-6 py-10">
                <Link
                    to="/jobs"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    ← Back to Jobs
                </Link>

                <div className="mt-6 rounded-xl bg-white p-8 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {job.title}
                            </h1>

                            <p className="mt-2 text-lg text-gray-500">
                                {job.company_name}
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600">
                            {job.employment_type}
                        </span>
                    </div>

                    <div className="mt-8 grid gap-4 border-y py-6 md:grid-cols-3">
                        <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {job.location || "Not specified"}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">Salary</p>
                            <p className="mt-1 font-medium text-gray-900">
                                ₹{Number(job.salary_min).toLocaleString("en-IN")}
                                {" - "}
                                ₹{Number(job.salary_max).toLocaleString("en-IN")}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">Experience</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {job.experience_level || "Not specified"}
                            </p>
                        </div>
                    </div>

                    <section className="mt-8">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Job Description
                        </h2>

                        <p className="mt-3 leading-7 text-gray-600">
                            {job.description}
                        </p>
                    </section>

                    {job.is_remote && (
                        <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm font-medium text-green-700">
                            This job supports remote work.
                        </div>
                    )}
                    <ApplicationForm jobId={job.id} />
                </div>
            </main>
        </div>
    );
}

export default JobDetails;