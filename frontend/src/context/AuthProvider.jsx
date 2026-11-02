import { useEffect, useState } from "react";
import api from "../services/api";
import {
    connectSocket,
    disconnectSocket,
} from "../services/socket";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(
        () => Boolean(localStorage.getItem("token"))
    );
    const [sessionRestoreError, setSessionRestoreError] =
        useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        api.get("/auth/me")
            .then((response) => {
                const currentUser =
                    response.data.data.user;

                setUser(currentUser);
                connectSocket();
            })
            .catch((error) => {
                const status = error.response?.status;

                if (status === 401 || status === 403) {
                    localStorage.removeItem("token");
                    disconnectSocket();
                    setUser(null);
                    return;
                }

                setSessionRestoreError(
                    "Your session could not be checked right now. Please try signing in again."
                );
                setUser(null);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const establishSession = (authenticatedUser, token) => {
            localStorage.setItem("token", token);
            setUser(authenticatedUser);
            setSessionRestoreError("");
            connectSocket();
    };

    const login = async (email, password) => {
            const response = await api.post("/auth/login", {
                email,
                password,
        });

        const { user: loggedInUser, token } =
            response.data.data;

        establishSession(loggedInUser, token);

        return loggedInUser;
    };

    const register = async ({
        fullName,
        email,
        password,
        role,
    }) => {
        const response = await api.post("/auth/register", {
            fullName,
            email,
            password,
            role,
        });

        const { user: registeredUser, token } =
            response.data.data;

        establishSession(registeredUser, token);

        return registeredUser;
    };

    const logout = () => {
        disconnectSocket();
        localStorage.removeItem("token");
        setUser(null);
        setSessionRestoreError("");
    };

    const updateProfilePhoto = (avatarUrl) => {
        setUser((currentUser) =>
            currentUser
                ? { ...currentUser, avatar_url: avatarUrl }
                : currentUser
        );
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                sessionRestoreError,
                login,
                register,
                logout,
                updateProfilePhoto,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
