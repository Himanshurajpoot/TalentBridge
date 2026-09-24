import { Link } from "react-router-dom";

function FreelancerDashboard() {
    return (
        <main className="mx-auto max-w-7xl px-6 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    Freelancer Dashboard
                </h1>

                <p className="mt-2 text-gray-600">
                    Find jobs, manage applications, and build your profile.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Link
                    to="/jobs"
                    className="block rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                    <h2 className="text-lg font-semibold text-gray-900">
                        Browse Jobs
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        Find jobs that match your skills and experience.
                    </p>

                    <span className="mt-4 inline-block text-sm font-semibold text-blue-600">
                        Browse Jobs →
                    </span>
                </Link>

                <Link
                    to="/applications"
                    className="block rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                    <h2 className="text-lg font-semibold text-gray-900">
                        My Applications
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        Track the jobs you have applied for.
                    </p>

                    <span className="mt-4 inline-block text-sm font-semibold text-blue-600">
                        View Applications →
                    </span>
                </Link>

                <Link
                    to="/profile"
                    className="block rounded-xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                    <h2 className="text-lg font-semibold text-gray-900">
                        My Profile
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        Update your professional information and skills.
                    </p>

                    <span className="mt-4 inline-block text-sm font-semibold text-blue-600">
                        Edit Profile →
                    </span>
                </Link>
            </div>
        </main>
    );
}

export default FreelancerDashboard;