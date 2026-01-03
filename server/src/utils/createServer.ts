import { corsConfig } from "../config/corsConfig";
import { createApp } from "./createApp";
import { Server } from "socket.io";
import http from 'http';
import { socketHandlers } from "./socketHandlers";

export function createServer() {
    const app = createApp();
    const server = http.createServer(app);

    const io = new Server(server, { cors: corsConfig });

    socketHandlers(io);

    return { app, server, io };
}