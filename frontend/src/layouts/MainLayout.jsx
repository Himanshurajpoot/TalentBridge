import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import NotificationBell from "../components/NotificationBell";

function MainLayout({ children }) {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="border-b bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link
                        to="/"
                        className="text-2xl font-bold text-blue-600"
                    >
                        TalentBridge
                    </Link>

                    <div className="flex items-center gap-4">
                        <NotificationBell />

                        <span className="text-gray-700">
                            {user?.full_name}
                        </span>

                        <button
                            type="button"
                            onClick={logout}
                            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {children}
        </div>
    );
}

export default MainLayout;
