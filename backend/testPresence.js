const { io } = require("socket.io-client");

const token = process.env.TOKEN;

if (!token) {
    console.error("TOKEN is missing.");
    process.exit(1);
}

function createConnection(name) {
    const socket = io("http://127.0.0.1:5001", {
        transports: ["polling"],
        auth: {
            token,
        },
    });

    socket.on("connect", () => {
        console.log(`${name} connected: ${socket.id}`);
    });

    socket.on("connect_error", (error) => {
        console.error(`${name} connection failed:`, error.message);
    });

    return socket;
}

// Create TWO connections for the same user
const socket1 = createConnection("Socket 1");
const socket2 = createConnection("Socket 2");

// Keep both connections alive for 10 seconds
setTimeout(() => {
    console.log("Closing Socket 1...");
    socket1.disconnect();
}, 5000);

setTimeout(() => {
    console.log("Closing Socket 2...");
    socket2.disconnect();
}, 10000);