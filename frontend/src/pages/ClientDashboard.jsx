import { Link } from "react-router-dom";

function ClientDashboard() {
    return (
        <main className="mx-auto max-w-7xl px-6 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    Client Dashboard
                </h1>

                <p className="mt-2 text-gray-600">
                    Post jobs, find freelancers, and manage your projects.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Link
                    to="/create-job"
                    className="block rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                    <h2 className="text-xl font-semibold text-gray-900">
                        Post a Job
                    </h2>

                    <p className="mt-3 text-gray-600">
                        Create job opportunities and find talented developers.
                    </p>

                    <span className="mt-5 inline-block font-semibold text-blue-600">
                        Create Job →
                    </span>
                </Link>

                <Link
                    to="/my-jobs"
                    className="block rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                    <h2 className="text-xl font-semibold text-gray-900">
                        My Jobs
                    </h2>

                    <p className="mt-3 text-gray-600">
                        Manage your posted jobs and applications.
                    </p>

                    <span className="mt-5 inline-block font-semibold text-blue-600">
                        View My Jobs →
                    </span>
                </Link>

                <Link
                    to="/my-projects"
                    className="block rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                    <h2 className="text-xl font-semibold text-gray-900">
                        My Projects
                    </h2>

                    <p className="mt-3 text-gray-600">
                        Manage freelance projects and proposals.
                    </p>

                    <span className="mt-5 inline-block font-semibold text-blue-600">
                        View My Projects →
                    </span>
                </Link>
            </div>
        </main>
    );
}

export default ClientDashboard;