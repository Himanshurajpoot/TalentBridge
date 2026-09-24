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
            .catch(() => {
                localStorage.removeItem("token");
                disconnectSocket();
                setUser(null);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const login = async (email, password) => {
        const response = await api.post("/auth/login", {
            email,
            password,
        });

        const { user: loggedInUser, token } =
            response.data.data;

        localStorage.setItem("token", token);
        setUser(loggedInUser);
        connectSocket();

        return loggedInUser;
    };

    const logout = () => {
        disconnectSocket();
        localStorage.removeItem("token");
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
