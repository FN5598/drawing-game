import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/connectDB";
import { Server } from "socket.io";
import http from 'http';
import cookieParser from "cookie-parser";
import { setupSwagger } from "./config/swagger";
import { fetchRandomWord } from "./utils/fetchRandomWord";
import { RoomState } from "./types/RoomState";
import { Socket } from "socket.io";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import taskRoutes from './routes/taskRoutes';

const app = express();
dotenv.config();
connectDB();

(async () => {
    await setupSwagger(app);
})();

// Middlewares
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use('/tasks', taskRoutes);


const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const roomWords: Map<string, string> = new Map();
const rooms = new Map<string, RoomState>();

io.on('connection', (socket) => {
    console.log("New socket connected:", socket.id)


    function startRoomTurn(roomId: string) {
        console.log("Started room timer");
        const room = rooms.get(roomId);
        if (!room) return;

        // Clear any existing timer
        if (room.turnTimeout) return;

        const turnTime = room.turnTime
        // Set the turn end time
        room.turnEndsAt = Date.now() + turnTime;
        console.log("Turn ends at:", room.turnEndsAt);

        // Schedule the next turn
        room.turnTimeout = setTimeout(() => {
            // Emit next player
            socket.emit("next-player");

            // Start the next turn
            startRoomTurn(roomId);
        }, turnTime);
    }

    function createRoom(isPrivate: boolean, maxPlayers?: number, turnTime?: number): RoomState {
        const roomId = crypto.randomUUID();

        const room: RoomState = {
            roomId: roomId,
            members: [],
            currentDrawerIndex: 0,
            turnEndsAt: null,
            maxPlayers: maxPlayers ?? 3,
            isPrivate,
            turnTimeout: null,
            turnTime: turnTime ?? 80 * 1000
        };

        console.log("Created room:", room);
        rooms.set(roomId, room);
        return room;
    }


    function findAvailableRoom(): RoomState | null {
        for (const room of rooms.values()) {
            if ((room.members.length < room.maxPlayers) && !room.isPrivate) {
                return room;
            }
        }
        return null;
    }

    async function joinRoom(roomId: string, socket: Socket, username: string) {
        console.log("Joined user", username, "To room", roomId);

        const room = rooms.get(roomId);
        if (!room) return;
        socket.join(roomId);

        if (!room?.turnEndsAt) {
            startRoomTurn(roomId);
        }


        socket.data.username = username;
        socket.data.roomId = roomId;

        if (!room.members.includes(socket.id)) {
            room.members.push(socket.id);
        }

        const messageToEmit = room.isPrivate ? "private-room-joined" : "room-joined"
        socket.emit(messageToEmit, roomId);

        if (!roomWords.has(roomId)) {
            const wordObj = await fetchRandomWord();
            const wordToGuess = wordObj?.word;
            if (wordToGuess) {
                roomWords.set(roomId, wordToGuess);
                console.log("New word created:", wordToGuess);
            }
        }
        const members = room.members.map(id => {
            const user = io.sockets.sockets.get(id);
            return {
                id,
                username: user?.data.username
            };
        });

        const currentDrawerId = room.members[room.currentDrawerIndex];
        const turnEndsAt = room.turnEndsAt;
        io.to(roomId).emit("room-info", {
            roomId,
            members,
            currentDrawerId,
            turnEndsAt
        })
    }

    socket.on("start-game", ({ roomId }: { roomId: string }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        io.to(roomId).emit("game-started", { roomId });

        console.log(`Game started in room ${roomId}`);
    })

    socket.on("create-private-room", async ({ username, maxPlayers, turnTime }: { username: string, maxPlayers: number, turnTime: number }) => {
        const isPrivate = true;
        const room = createRoom(isPrivate, maxPlayers, turnTime);
        if (!room) return;

        await joinRoom(room.roomId, socket, username);

        socket.emit("private-room-created", room.roomId);
    })

    socket.on("join-room", async ({ roomId, username }: { roomId: string, username: string }) => {
        const room = rooms.get(roomId);
        if (!room) return;


        await joinRoom(roomId, socket, username);

        const members = room.members.map(id => {
            const user = io.sockets.sockets.get(id);
            return {
                id,
                username: user?.data.username
            };
        });
        console.log("Members:", members);
        const currentDrawerId = room.members[room.currentDrawerIndex];
        const turnEndsAt = room.turnEndsAt;

        io.to(roomId).emit("room-info", {
            roomId,
            members,
            currentDrawerId,
            turnEndsAt
        })
        console.log("Emitted info");
    })

    socket.on("find-room", async ({ username, isPrivate }: { username: string, isPrivate: boolean }) => {
        let room = findAvailableRoom();
        console.log("Found availible rooms:", room);

        if (!room) {
            room = createRoom(isPrivate);
            console.log("Created room:", room);
        }

        await joinRoom(room.roomId, socket, username);
    });

    socket.on("next-player", async () => {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        // Randomly select the next drawer index
        room.currentDrawerIndex = Math.floor(Math.random() * room.members.length);

        const members = room.members.map(id => {
            const user = io.sockets.sockets.get(id);
            return {
                id,
                username: user?.data.username
            }
        });

        const wordObj = await fetchRandomWord();
        const wordToGuess = wordObj?.word;
        if (wordToGuess) {
            roomWords.set(roomId, wordToGuess);
            console.log("New word created:", wordToGuess);
        }

        io.to(roomId).emit("word-to-guess", wordToGuess);
        io.to(roomId).emit("erase-canvas");

        const turnEndsAt = room.turnEndsAt;
        const currentDrawerId = room.members[room.currentDrawerIndex];
        io.to(roomId).emit("room-info", {
            roomId,
            members,
            currentDrawerId,
            turnEndsAt
        });
    });

    socket.on("get-word", () => {
        const roomId = socket.data.roomId;
        if (!roomId) {
            socket.emit("word-to-guess", "");
            return;
        }
        const word = roomWords.get(roomId);
        console.log("Sending word to client:", word);
        socket.emit("word-to-guess", word || "");
    });

    socket.on("message", (data) => {
        const roomId = socket.data.roomId;
        if (!roomId) return;
        io.to(roomId).emit("message", { msg: data.msg, username: data.username });
    });

    socket.on("get-room-info", () => {
        const roomId = socket.data.roomId;
        const room = rooms.get(roomId)
        if (!room) return;

        const members = room.members.map(id => {
            const user = io.sockets.sockets.get(id);
            return {
                id,
                username: user?.data.username
            }
        });

        const turnEndsAt = room.turnEndsAt
        const currentDrawerId = room.members[room.currentDrawerIndex];
        io.to(roomId).emit("room-info", {
            roomId,
            members,
            currentDrawerId,
            turnEndsAt
        })

    });

    socket.on("draw", (data) => {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        const currentDrawerId = room.members[room.currentDrawerIndex];

        if (socket.id !== currentDrawerId) {
            return;
        }

        io.to(roomId).emit("draw", data);
    });

    socket.on("erase-canvas", () => {
        const roomId = socket.data.roomId;
        if (!roomId) return;
        io.to(roomId).emit("erase-canvas");
    });

    socket.on("leave-room", () => {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        socket.leave(roomId);
        socket.data.roomId = null;
        room.members = room.members.filter(id => id !== socket.id);

        if (room.members.length === 0) {
            if (room.turnTimeout) {
                clearTimeout(room.turnTimeout);
                room.turnTimeout = null;
            }

            rooms.delete(room.roomId);
        }

        const members = room.members.map(id => {
            const user = io.sockets.sockets.get(id);
            return {
                id,
                username: user?.data.username
            }
        });

        const currentDrawerId = room.members[room.currentDrawerIndex];
        io.to(roomId).emit("room-info", {
            roomId,
            members,
            currentDrawerId
        });

        socket.emit("left-room");
        io.to(roomId).emit("user-left", socket.id);
    });

    socket.on("disconnect", () => {
        const roomId = socket.data.roomId;
        if (roomId) {
            io.to(roomId).emit("user-left", socket.id);
        }
    });
})

server.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT}`);
})