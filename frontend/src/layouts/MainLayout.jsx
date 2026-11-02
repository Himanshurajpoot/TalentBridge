import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import NotificationBell from "../components/NotificationBell";
import ProfileAvatar from "../components/ProfileAvatar";

function MainLayout({ children }) {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="border-b bg-white">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
                    <Link
                        to="/"
                        className="text-xl font-bold text-blue-600 sm:text-2xl"
                    >
                        TalentBridge
                    </Link>

                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                        <Link
                            to="/contracts"
                            className="text-sm font-medium text-gray-700 hover:text-blue-600"
                        >
                            Contracts
                        </Link>

                        <NotificationBell />

                        <Link
                            to="/profile"
                            className="flex max-w-36 items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 sm:max-w-none"
                        >
                            <ProfileAvatar
                                name={user?.full_name}
                                photoUrl={user?.avatar_url}
                                className="h-8 w-8 text-xs"
                            />
                            <span className="max-w-24 truncate sm:max-w-none">
                                {user?.full_name}
                            </span>
                            <span className="sr-only"> (Profile)</span>
                        </Link>

                        <button
                            type="button"
                            onClick={logout}
                            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 sm:px-4"
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
