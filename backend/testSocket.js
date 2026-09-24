const { io } = require("socket.io-client");

const token = process.env.TOKEN;

if (!token) {
    console.error("TOKEN is missing.");
    process.exit(1);
}

console.log("Token loaded:", token.substring(0, 20) + "...");



const socket = io("http://127.0.0.1:5001", {
    transports: ["polling"],
    auth: {
        token: token,
    },
});

socket.on("connect", () => {
    console.log("Socket connected successfully!");
    console.log("Socket ID:", socket.id);

    // Join conversation #1
  socket.emit("joinConversation", 1, (response) => {
    console.log("Join response:", response);
});

    console.log("Joined conversation:1");

    // Send a test message
    setTimeout(() => {
        socket.emit(
            "sendMessage",
            {
                conversationId: 1,
                content: "Hello from TalentBridge Socket.IO!",
            },
            (response) => {
                console.log("Send response:", response);
            }
        );
    }, 500);
});

socket.on("newMessage", (message) => {
    console.log("New message received:");
    console.log(message);
});

socket.on("userOnline", (data) => {
    console.log("🟢 USER ONLINE:", data);
});

socket.on("userOffline", (data) => {
    console.log("⚫ USER OFFLINE:", data);
});

socket.on("connect_error", (error) => {
    console.error("Connection failed:", error.message);
});