const { io } = require("socket.io-client");

const token = process.env.TOKEN;

if (!token) {
    console.error("TOKEN is missing.");
    process.exit(1);
}

const socket = io("http://127.0.0.1:5001", {
    transports: ["polling"],
    auth: {
        token,
    },
});

socket.on("connect", () => {
    console.log("CLIENT connected!");
    console.log("Socket ID:", socket.id);

    socket.emit("joinConversation", 1, (response) => {
        console.log("Join response:", response);

        if (!response.success) {
            return;
        }

        socket.emit("markAsRead", 13, (response) => {
            console.log("Mark as read response:", response);
        });
    });
});

socket.on("newMessage", (message) => {
    console.log("\n📩 CLIENT RECEIVED MESSAGE:");
    console.log(message);
});

socket.on("messageRead", (data) => {
    console.log("\n✅ MESSAGE READ:");
    console.log(data);
});

socket.on("newNotification", (notification) => {
    console.log("\n🔔 NEW NOTIFICATION:");
    console.log(notification);
});

socket.on("userOnline", (data) => {
    console.log("\n🟢 USER ONLINE:");
    console.log(data);
});

socket.on("userOffline", (data) => {
    console.log("\n⚫ USER OFFLINE:");
    console.log(data);
});

socket.on("connect_error", (error) => {
    console.error("Client connection failed:", error.message);
});