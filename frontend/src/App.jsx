import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./context/useAuth";

import MainLayout from "./layouts/MainLayout";

import Login from "./pages/Login";
import FreelancerDashboard from "./pages/FreelancerDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import CreateProposal from "./pages/CreateProposal";
import Proposals from "./pages/Proposals";
import MyProjects from "./pages/MyProjects";
import ProjectProposals from "./pages/ProjectProposals";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import Applications from "./pages/Applications";
import Profile from "./pages/Profile";
import CreateJob from "./pages/CreateJob";
import MyJobs from "./pages/MyJobs";
import JobApplications from "./pages/JobApplications";
import Messages from "./pages/Messages";

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function DashboardRoute() {
    const { user } = useAuth();

    if (user?.role === "client") {
        return <ClientDashboard />;
    }

    return <FreelancerDashboard />;
}

function App() {
    return (
        <Routes>
            <Route
                path="/login"
                element={<Login />}
            />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <DashboardRoute />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/projects"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Projects />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/projects/:id"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <ProjectDetails />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/projects/:projectId/proposal"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <CreateProposal />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/proposals"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Proposals />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/my-projects"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <MyProjects />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/projects/:projectId/proposals"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <ProjectProposals />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/jobs"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Jobs />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/jobs/:id"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <JobDetails />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/applications"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Applications />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Profile />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/create-job"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <CreateJob />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/my-jobs"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <MyJobs />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/jobs/:jobId/applications"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <JobApplications />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/messages"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Messages />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="*"
                element={<Navigate to="/" replace />}
            />
        </Routes>
    );
}

export default App;
