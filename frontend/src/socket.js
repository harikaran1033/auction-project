// src/socket.js (for example)
import { io } from "socket.io-client";

// Use the environment variable
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;

const socket = io(SOCKET_URL, {
  transports: ["polling", "websocket"],
});

export default socket;
