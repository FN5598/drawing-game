import { Socket, Server } from "socket.io";
import { DrawData } from "../types/DrawData";
import { fetchRandomWord } from "./fetchRandomWord";
import { RoomState } from "../types/RoomState";
import { bannedWordsList } from "./bannedWordList";

const roomWords: Map<string, string> = new Map();
const rooms = new Map<string, RoomState>();
const bannedWordsSet = new Set(bannedWordsList);

export function socketHandlers(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log("New socket connected:", socket.id)


        function startRoomTurn(roomId: string) {
            const room = rooms.get(roomId);
            if (!room) return;

            // Clear any existing timer
            if (room.turnTimeout) {
                clearTimeout((room.turnTimeout));
            }

            const turnTime = room.turnTime

            room.turnEndsAt = Date.now() + turnTime;

            // Schedule the next turn
            room.turnTimeout = setTimeout(() => {
                // Emit next player
                io.to(roomId).emit("next-player");


                room.turnTimeout = null;
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
                turnTime: turnTime ?? 80 * 1000,
                guessedMembers: [],
                roomDrawing: []
            };

            rooms.set(roomId, room);
            return room;
        }

        function emitRoomInfo(roomId: string) {
            const room = rooms.get(roomId);
            if (!room) return;
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
                currentDrawerId,
                turnEndsAt: room.turnEndsAt
            });
        }

        function findAvailableRoom(): RoomState | null {
            for (const room of rooms.values()) {
                if ((room.members.length < room.maxPlayers) && !room.isPrivate) {
                    return room;
                }
            }
            return null;
        }

        function LeaveRoom() {
            const roomId = socket.data.roomId;
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room) return;

            socket.leave(roomId);
            socket.emit("left-room");
            socket.data.roomId = null;
            room.members = room.members.filter(id => id !== socket.id);

            if (room.members.length > 0) {
                nextPlayerDrawing(roomId);
            } else {
                if (room.turnTimeout) {
                    clearTimeout(room.turnTimeout);
                    room.turnTimeout = null;
                }

                rooms.delete(room.roomId);
                return;
            }

            if (room.currentDrawerIndex >= room.members.length) {
                room.currentDrawerIndex = 0;
            }

            emitRoomInfo(roomId);

            if (room.members.length === 0) return;
            io.to(roomId).emit("user-left", socket.id);
        }

        async function nextPlayerDrawing(roomId: string) {
            const room = rooms.get(roomId);
            if (!room) return;
            if (room.members.length <= 1) {
                LeaveRoom();
                socket.emit("not-enough-players");
            };

            // Randomly select the next drawer index
            room.currentDrawerIndex = Math.floor(Math.random() * room.members.length);

            const members = room.members.map(id => {
                const user = io.sockets.sockets.get(id);
                return {
                    id,
                    username: user?.data.username
                }
            });

            if (room.turnTimeout) {
                clearTimeout((room.turnTimeout));
            }

            startRoomTurn(roomId);

            const wordObj = await fetchRandomWord();
            const wordToGuess = wordObj?.word;
            if (wordToGuess) {
                roomWords.set(roomId, wordToGuess);
            }

            io.to(roomId).emit("word-to-guess", wordToGuess);
            io.to(roomId).emit("erase-canvas");

            emitRoomInfo(roomId);
        }

        async function joinRoom(roomId: string, socket: Socket, username: string) {
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

        socket.on("user-guessed-word", ({ id, roomId }: { id: string, roomId: string }) => {
            const room = rooms.get(roomId);
            if (!room) return;

            if (!room.guessedMembers?.includes(id)) {
                room.guessedMembers?.push(id);
            }

            if (room.guessedMembers?.length === room.members.length - 1) {
                room.guessedMembers = [];
                nextPlayerDrawing(roomId);
                socket.emit("next-player");
                io.to(roomId).emit("all-players-guessed");
            }
        })

        socket.on("start-game", ({ roomId }: { roomId: string }) => {
            const room = rooms.get(roomId);
            if (!room) return;

            io.to(roomId).emit("game-started", { roomId });
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

            emitRoomInfo(roomId);
        })

        socket.on("find-room", async ({ username, isPrivate }: { username: string, isPrivate: boolean }) => {
            let room = findAvailableRoom();

            if (!room) {
                room = createRoom(isPrivate);
            }

            await joinRoom(room.roomId, socket, username);
        });

        socket.on("next-player", async () => {
            const roomId = socket.data.roomId;
            nextPlayerDrawing(roomId);
        });

        socket.on("get-word", () => {
            const roomId = socket.data.roomId;
            const room = rooms.get(roomId);
            if (!room) return;
            if (!roomId) {
                socket.emit("word-to-guess", "");
                return;
            }
            const word = roomWords.get(roomId);
            socket.emit("word-to-guess", word || "");
            socket.emit("current-drawing", { drawingData: room.roomDrawing });
        });

        socket.on("message", ({ msg, username }: { msg: string, username: string }) => {
            const roomId = socket.data.roomId;
            if (!roomId) return;

            const normalizedMsg = msg.toLowerCase().replace(/[^\w\s]/g, "");
            const words = normalizedMsg.split(/\s+/);
            for (const word of words) {
                if (bannedWordsSet.has(word)) {
                    socket.emit("message", { msg: "Cannot use profane words!", username });
                    return
                }
            }

            io.to(roomId).emit("message", { msg, username });
        });

        socket.on("get-room-info", () => {
            const roomId = socket.data.roomId;
            const room = rooms.get(roomId)
            if (!room) return;

            emitRoomInfo(roomId);
        });

        socket.on("draw", (data: DrawData) => {
            const roomId = socket.data.roomId;
            if (!roomId) return;

            const room = rooms.get(roomId);
            if (!room) return;

            const currentDrawerId = room.members[room.currentDrawerIndex];

            if (socket.id !== currentDrawerId) {
                return;
            }

            room.roomDrawing.push(data)

            io.to(roomId).emit("draw", data);
        });

        socket.on("erase-canvas", () => {
            const roomId = socket.data.roomId;
            if (!roomId) return;
            io.to(roomId).emit("erase-canvas");
        });

        socket.on("leave-room", () => {
            LeaveRoom()
        });

        socket.on("disconnect", () => {
            const roomId = socket.data.roomId;
            if (roomId) {
                io.to(roomId).emit("user-left", socket.id);
            }
        });
    })
}