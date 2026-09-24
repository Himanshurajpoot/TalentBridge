import { io } from "socket.io-client";

const SOCKET_URL = "http://127.0.0.1:5001";

let socket = null;

export const connectSocket = () => {
    const token = localStorage.getItem("token");

    if (!token) {
        return null;
    }

    if (socket?.connected) {
        return socket;
    }

    socket = io(SOCKET_URL, {
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