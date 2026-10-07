import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function getLoggedInUserId() {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      return null;
    }

    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id || payload.userId || payload.user_id || null;
  } catch {
    return null;
  }
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatBudget(minBudget, maxBudget) {
  if (minBudget == null && maxBudget == null) {
    return "Budget not specified";
  }

  if (minBudget != null && maxBudget != null) {
    return `${formatCurrency(minBudget)} - ${formatCurrency(maxBudget)}`;
  }

  if (minBudget != null) {
    return `From ${formatCurrency(minBudget)}`;
  }

  return `Up to ${formatCurrency(maxBudget)}`;
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getApplicationStatusStyles(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "accepted") {
    return "bg-green-100 text-green-700";
  }

  if (normalized === "rejected") {
    return "bg-red-100 text-red-700";
  }

  if (normalized === "shortlisted") {
    return "bg-purple-100 text-purple-700";
  }

  if (normalized === "reviewing") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

function getProjectStatusStyles(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "completed") {
    return "bg-green-100 text-green-700";
  }

  if (
    normalized === "in_progress" ||
    normalized === "in-progress" ||
    normalized === "active"
  ) {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-gray-100 text-gray-700";
}

export default function FreelancerDashboard() {
  const [applications, setApplications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = getLoggedInUserId();

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const applicationRequest = api.get("/applications/me");

        const projectRequest = userId
          ? api.get(`/projects/user/${userId}/portfolio`)
          : Promise.resolve({ data: [] });

        const [applicationResponse, projectResponse] = await Promise.all([
          applicationRequest,
          projectRequest,
        ]);

        if (!mounted) {
          return;
        }

        const applicationData = Array.isArray(
          applicationResponse.data?.data?.applications
        )
          ? applicationResponse.data.data.applications
          : Array.isArray(applicationResponse.data?.applications)
            ? applicationResponse.data.applications
            : Array.isArray(applicationResponse.data)
              ? applicationResponse.data
            : [];

        const projectData = Array.isArray(
          projectResponse.data?.data?.projects
        )
          ? projectResponse.data.data.projects
          : Array.isArray(projectResponse.data?.projects)
            ? projectResponse.data.projects
            : Array.isArray(projectResponse.data)
              ? projectResponse.data
            : [];

        setApplications(applicationData);
        setProjects(projectData);
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Unable to load dashboard data."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const applicationStats = useMemo(() => {
    const stats = {
      total: applications.length,
      pending: 0,
      reviewing: 0,
      shortlisted: 0,
      accepted: 0,
      rejected: 0,
    };

    applications.forEach((application) => {
      const status = String(application.status || "pending").toLowerCase();

      if (status === "pending") {
        stats.pending += 1;
      } else if (status === "reviewing") {
        stats.reviewing += 1;
      } else if (status === "shortlisted") {
        stats.shortlisted += 1;
      } else if (status === "accepted") {
        stats.accepted += 1;
      } else if (status === "rejected") {
        stats.rejected += 1;
      }
    });

    return stats;
  }, [applications]);

  const activeProjects = useMemo(() => {
    return projects.filter((project) => {
      const status = String(project.status || "").toLowerCase();

      return (
        status === "in_progress" ||
        status === "in-progress" ||
        status === "active"
      );
    });
  }, [projects]);

  const completedProjects = useMemo(() => {
    return projects.filter((project) => {
      return String(project.status || "").toLowerCase() === "completed";
    });
  }, [projects]);

  const recentApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => {
        const first = new Date(
          a.applied_at || a.created_at || a.createdAt || 0
        ).getTime();

        const second = new Date(
          b.applied_at || b.created_at || b.createdAt || 0
        ).getTime();

        return second - first;
      })
      .slice(0, 5);
  }, [applications]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Freelancer Dashboard
              </p>

              <h1 className="mt-1 text-3xl font-bold text-gray-900">
                Welcome back
              </h1>

              <p className="mt-2 text-gray-500">
                Track your applications, projects and freelance activity.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/jobs"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Browse Jobs →
              </Link>

              <Link
                to="/projects"
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Browse Projects
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/applications"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">
              Total Applications
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {applicationStats.total}
            </p>
          </Link>

          <Link
            to="/applications"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {applicationStats.pending}
            </p>
          </Link>

          <Link
            to="/applications"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Reviewing</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {applicationStats.reviewing}
            </p>
          </Link>

          <Link
            to="/applications"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Shortlisted</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">
              {applicationStats.shortlisted}
            </p>
          </Link>

          <Link
            to="/applications"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Accepted</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {applicationStats.accepted}
            </p>
          </Link>

          <Link
            to="/applications"
            className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Rejected</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {applicationStats.rejected}
            </p>
          </Link>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Active Projects
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {activeProjects.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Completed Projects
            </p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {completedProjects.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Quick Actions
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Access your main freelancer workflows.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                to="/jobs"
                className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="font-semibold text-gray-900">Browse Jobs</p>
                <p className="mt-1 text-sm text-gray-500">
                  Find jobs and submit applications.
                </p>
              </Link>

              <Link
                to="/projects"
                className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="font-semibold text-gray-900">
                  Browse Projects
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Explore freelance projects.
                </p>
              </Link>

              <Link
                to="/applications"
                className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="font-semibold text-gray-900">
                  My Applications
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Track your job applications.
                </p>
              </Link>

              <Link
                to="/proposals"
                className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="font-semibold text-gray-900">My Proposals</p>
                <p className="mt-1 text-sm text-gray-500">
                  Track proposals submitted to projects.
                </p>
              </Link>

              <Link
                to="/messages"
                className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="font-semibold text-gray-900">Messages</p>
                <p className="mt-1 text-sm text-gray-500">
                  Communicate with clients and project members.
                </p>
              </Link>

              <Link
                to="/profile"
                className="rounded-xl border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50 sm:col-span-2"
              >
                <p className="font-semibold text-gray-900">My Profile</p>
                <p className="mt-1 text-sm text-gray-500">
                  Update your freelancer profile and professional information.
                </p>
              </Link>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Recent Applications
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Your latest job applications.
                </p>
              </div>

              <Link
                to="/applications"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View All →
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="font-medium text-gray-700">
                  No applications yet
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Browse available jobs and submit your first application.
                </p>

                <Link
                  to="/jobs"
                  className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Browse Jobs
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {recentApplications.map((application) => {
                  const status = String(
                    application.status || "pending"
                  ).toLowerCase();

                  const jobTitle =
                    application.job_title ||
                    application.title ||
                    application.job?.title ||
                    "Job Application";

                  const companyName =
                    application.company_name ||
                    application.company?.name ||
                    "Company";

                  return (
                    <div
                      key={application.id}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-gray-900">
                            {jobTitle}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {companyName}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Applied{" "}
                            {formatDate(
                              application.applied_at ||
                                application.created_at ||
                                application.createdAt
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getApplicationStatusStyles(
                              status
                            )}`}
                          >
                            {status.replace("_", " ")}
                          </span>

                          <Link
                            to="/applications"
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                          >
                            View →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Active Projects
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Projects you are currently working on.
              </p>
            </div>

          </div>

          {activeProjects.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="font-medium text-gray-700">
                No active projects
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Your active projects will appear here.
              </p>

              <Link
                to="/projects"
                className="mt-4 inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Browse Projects
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeProjects.map((project) => {
                const projectId = project.id;

                return (
                  <div
                    key={projectId}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">
                          {project.title || "Untitled Project"}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {project.company_name ||
                            project.company?.name ||
                            "Company not specified"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getProjectStatusStyles(
                          project.status
                        )}`}
                      >
                        {String(project.status || "active").replace(
                          "_",
                          " "
                        )}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium text-gray-800">
                          Budget:
                        </span>{" "}
                        {formatBudget(
                          project.budget_min,
                          project.budget_max
                        )}
                      </p>

                      {project.experience_level && (
                        <p>
                          <span className="font-medium text-gray-800">
                            Experience:
                          </span>{" "}
                          {project.experience_level}
                        </p>
                      )}
                    </div>

                    {projectId && (
                      <Link
                        to={`/projects/${projectId}`}
                        className="mt-5 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View Project →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Completed Projects
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Projects you have successfully completed.
              </p>
            </div>

          </div>

          {completedProjects.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="font-medium text-gray-700">
                No completed projects
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Completed projects will appear here after you finish them.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {completedProjects.map((project) => {
                const projectId = project.id;

                return (
                  <div
                    key={projectId}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">
                          {project.title || "Untitled Project"}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {project.company_name ||
                            project.company?.name ||
                            "Company not specified"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Completed
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium text-gray-800">
                          Budget:
                        </span>{" "}
                        {formatBudget(
                          project.budget_min,
                          project.budget_max
                        )}
                      </p>

                      {project.experience_level && (
                        <p>
                          <span className="font-medium text-gray-800">
                            Experience:
                          </span>{" "}
                          {project.experience_level}
                        </p>
                      )}

                      <p>
                        <span className="font-medium text-gray-800">
                          Completed:
                        </span>{" "}
                        {formatDate(
                          project.completed_at ||
                            project.completedAt ||
                            project.updated_at ||
                            project.updatedAt
                        )}
                      </p>
                    </div>

                    {projectId && (
                      <Link
                        to={`/projects/${projectId}`}
                        className="mt-5 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View Project →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <Link
              to="/jobs"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Find Jobs
            </Link>

            <Link
              to="/projects"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Find Projects
            </Link>

            <Link
              to="/applications"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Applications
            </Link>

            <Link
              to="/proposals"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Proposals
            </Link>

            <Link
              to="/messages"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Messages
            </Link>

            <Link
              to="/profile"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Profile
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}