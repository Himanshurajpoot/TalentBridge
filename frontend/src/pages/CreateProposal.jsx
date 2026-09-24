import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function CreateProposal() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);

    const [form, setForm] = useState({
        coverLetter: "",
        proposedBudget: "",
        estimatedDays: "",
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await api.get(
                    `/projects/${projectId}`
                );

                setProject(
                    response.data.data.project
                );
            } catch (error) {
                console.error(
                    "Failed to fetch project:",
                    error
                );

                setError(
                    error.response?.data?.message ||
                        "Failed to load project."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [projectId]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSubmitting(true);
        setError("");
        setSuccess("");

        if (!form.coverLetter.trim()) {
            setError("Cover letter is required.");
            setSubmitting(false);
            return;
        }

        if (
            form.proposedBudget === "" ||
            Number(form.proposedBudget) <= 0
        ) {
            setError(
                "Please enter a valid proposed budget."
            );
            setSubmitting(false);
            return;
        }

        if (
            form.estimatedDays === "" ||
            Number(form.estimatedDays) <= 0
        ) {
            setError(
                "Please enter a valid estimated number of days."
            );
            setSubmitting(false);
            return;
        }

        try {
            await api.post(
                `/projects/${projectId}/proposals`,
                {
                    coverLetter:
                        form.coverLetter.trim(),
                    proposedBudget:
                        Number(form.proposedBudget),
                    estimatedDays:
                        Number(form.estimatedDays),
                }
            );

            setSuccess(
                "Proposal submitted successfully."
            );

            setTimeout(() => {
                navigate("/proposals");
            }, 1000);
        } catch (error) {
            console.error(
                "Failed to submit proposal:",
                error
            );

            setError(
                error.response?.data?.message ||
                    "Failed to submit proposal."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <main className="mx-auto max-w-3xl px-6 py-10">
                    <p className="text-gray-600">
                        Loading project...
                    </p>
                </main>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gray-100">
                <main className="mx-auto max-w-3xl px-6 py-10">
                    <div className="rounded-xl bg-white p-8 shadow-sm">
                        <p className="text-gray-600">
                            Project not found.
                        </p>

                        <Link
                            to="/projects"
                            className="mt-5 inline-block font-semibold text-blue-600 hover:text-blue-800"
                        >
                            ← Back to Projects
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <main className="mx-auto max-w-3xl px-6 py-10">

                {/* Back */}
                <Link
                    to={`/projects/${projectId}`}
                    className="mb-6 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800"
                >
                    ← Back to Project
                </Link>

                {/* Form Card */}
                <div className="rounded-xl bg-white p-8 shadow-sm">

                    <div className="border-b pb-6">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Submit Proposal
                        </h1>

                        <p className="mt-2 text-gray-600">
                            Apply for this freelance project.
                        </p>

                        <div className="mt-5 rounded-lg bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">
                                Project
                            </p>

                            <p className="mt-1 font-semibold text-gray-900">
                                {project.title}
                            </p>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-600">
                            {success}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="mt-8"
                    >

                        {/* Cover Letter */}
                        <div>
                            <label
                                htmlFor="coverLetter"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Cover Letter
                            </label>

                            <textarea
                                id="coverLetter"
                                name="coverLetter"
                                rows="7"
                                value={form.coverLetter}
                                onChange={handleChange}
                                placeholder="Tell the client why you are a good fit for this project..."
                                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            />

                            <p className="mt-2 text-xs text-gray-500">
                                Explain your relevant skills,
                                experience, and approach to the
                                project.
                            </p>
                        </div>

                        {/* Budget + Days */}
                        <div className="mt-6 grid gap-6 md:grid-cols-2">

                            <div>
                                <label
                                    htmlFor="proposedBudget"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Proposed Budget (₹)
                                </label>

                                <input
                                    id="proposedBudget"
                                    name="proposedBudget"
                                    type="number"
                                    min="1"
                                    value={
                                        form.proposedBudget
                                    }
                                    onChange={handleChange}
                                    placeholder="45000"
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="estimatedDays"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Estimated Days
                                </label>

                                <input
                                    id="estimatedDays"
                                    name="estimatedDays"
                                    type="number"
                                    min="1"
                                    value={
                                        form.estimatedDays
                                    }
                                    onChange={handleChange}
                                    placeholder="20"
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                />
                            </div>

                        </div>

                        {/* Submit */}
                        <div className="mt-8 flex gap-4">

                            <Link
                                to={`/projects/${projectId}`}
                                className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting
                                    ? "Submitting..."
                                    : "Submit Proposal"}
                            </button>

                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
}

export default CreateProposal;