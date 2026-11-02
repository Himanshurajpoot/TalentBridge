import { io } from "socket.io-client";

const DEVELOPMENT_SOCKET_URL = "http://127.0.0.1:5001";

let socket = null;

export const connectSocket = () => {
    const token = localStorage.getItem("token");

    if (!token) {
        return null;
    }

    if (socket?.connected) {
        return socket;
    }

    const socketUrl =
        import.meta.env.VITE_SOCKET_URL ||
        (import.meta.env.DEV ? DEVELOPMENT_SOCKET_URL : null);

    if (!socketUrl) {
        console.error(
            "Socket URL is not configured for this production build."
        );
        return null;
    }

    if (import.meta.env.PROD) {
        try {
            const hostname = new URL(
                socketUrl,
                window.location.origin
            ).hostname.toLowerCase();
            const isLoopback =
                hostname === "localhost" ||
                hostname.endsWith(".localhost") ||
                hostname.startsWith("127.") ||
                hostname === "::1" ||
                hostname === "[::1]";

            if (isLoopback) {
                console.error(
                    "Production Socket.IO URL must not use a loopback host."
                );
                return null;
            }
        } catch {
            console.error(
                "Production Socket.IO URL is invalid."
            );
            return null;
        }
    }

    socket = io(socketUrl, {
        transports: ["polling"],
        auth: {
            token,
        },
    });

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection failed:", error.message);
    });

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
    });

    return socket;
};

export const getSocket = () => {
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};