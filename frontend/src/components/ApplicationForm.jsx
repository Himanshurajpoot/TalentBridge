import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function ApplicationForm({ jobId }) {
    const navigate = useNavigate();

    const [coverLetter, setCoverLetter] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            await api.post(`/jobs/${jobId}/applications`, {
                coverLetter,
                resumeUrl,
            });

            setSuccess("Application submitted successfully!");

            setCoverLetter("");
            setResumeUrl("");

            setTimeout(() => {
                navigate("/applications");
            }, 1000);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                    "Failed to submit application."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8 border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900">
                Apply for this job
            </h2>

            {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {error}
                </div>
            )}

            {success && (
                <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                <div>
                    <label
                        htmlFor="coverLetter"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Cover Letter
                    </label>

                    <textarea
                        id="coverLetter"
                        value={coverLetter}
                        onChange={(event) =>
                            setCoverLetter(event.target.value)
                        }
                        required
                        rows="6"
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        placeholder="Tell the client why you're a good fit..."
                    />
                </div>

                <div>
                    <label
                        htmlFor="resumeUrl"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Resume URL
                    </label>

                    <input
                        id="resumeUrl"
                        type="url"
                        value={resumeUrl}
                        onChange={(event) =>
                            setResumeUrl(event.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                        placeholder="https://example.com/resume.pdf"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? "Submitting..." : "Submit Application"}
                </button>
            </form>
        </div>
    );
}

export default ApplicationForm;