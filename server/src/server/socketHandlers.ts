import { Socket, Server } from "socket.io";
import { DrawData } from "../types/DrawData";
import { bannedWordsList } from "../utils/wordLists/bannedWordList";
import * as socketUtils from "./socketUtils";

const bannedWordsSet = new Set(bannedWordsList);

export function socketHandlers(io: Server) {
    io.on('connection', (socket: Socket) => {
        socket.on("user-guessed-word", ({ id, roomId }: { id: string, roomId: string }) => {
            const room = socketUtils.rooms.get(roomId);
            if (!room) return;

            if (!room.guessedMembers?.includes(id)) {
                room.guessedMembers?.push(id);
            }

            if (room.guessedMembers?.length === room.members.length - 1) {
                room.guessedMembers = [];
                socketUtils.nextPlayerDrawing(roomId, socket, io);
                socket.emit("next-player");
                if (!(room.members.length === 2)) {
                    io.to(roomId).emit("message", { msg: `All players have guessed the word! Starting new game.`, username: "Server" });
                }
            }
        })

        socket.on("start-game", ({ roomId }: { roomId: string }) => {
            const room = socketUtils.rooms.get(roomId);
            if (!room) return;
            socketUtils.startRoomTurn(io, roomId);
            socketUtils.emitRoomInfo(io, roomId);
            io.to(roomId).emit("game-started", { roomId });
        })

        socket.on("create-private-room", async ({ username, maxPlayers, turnTime }: { username: string, maxPlayers: number, turnTime: number }) => {
            const isPrivate = true;
            const room = socketUtils.createRoom(isPrivate, maxPlayers, turnTime);
            if (!room) return;

            await socketUtils.joinRoom(room.roomId, socket, username, io);

            socket.emit("private-room-created", room.roomId);
        })

        socket.on("join-room", async ({ roomId, username }: { roomId: string, username: string }) => {
            const room = socketUtils.rooms.get(roomId);
            if (!room) return;


            await socketUtils.joinRoom(roomId, socket, username, io);

            socketUtils.emitRoomInfo(io, roomId);
        })

        socket.on("find-room", async ({ username, isPrivate }: { username: string, isPrivate: boolean }) => {
            let room = socketUtils.findAvailableRoom();

            if (!room) {
                room = socketUtils.createRoom(isPrivate);
            }
            if (room) {
                await socketUtils.joinRoom(room.roomId, socket, username, io);
            }
            return;
        });

        socket.on("next-player", async () => {
            const roomId = socket.data.roomId;
            socketUtils.nextPlayerDrawing(roomId, socket, io);
        });

        socket.on("get-word", () => {
            const roomId = socket.data.roomId;
            const room = socketUtils.rooms.get(roomId);
            if (!room) return;
            if (!roomId) {
                socket.emit("word-to-guess", "");
                return;
            }
            const word = socketUtils.roomWords.get(roomId);
            socket.emit("word-to-guess", word || "");
            socket.emit("current-drawing", { drawingData: room.roomDrawing });
        });

        socket.on("message", ({ msg, username }: { msg: string, username: string }) => {
            if (!username || !msg) return;

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

        socket.on("get-room-info", (roomId: string) => {
            const room = socketUtils.rooms.get(roomId)
            if (!room) return;

            socketUtils.emitRoomInfo(io, roomId);
        });

        socket.on("draw", (data: DrawData) => {
            const roomId = socket.data.roomId;
            if (!roomId) return;

            const room = socketUtils.rooms.get(roomId);
            if (!room) return;

            const currentDrawerId = room.members[room.currentDrawerIndex]?.id;

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
            const roomId = socket.data.roomId;
            socketUtils.leaveRoom(io, roomId, socket)
        });

        socket.on("delete-last-draw", (roomId: string) => {
            if (!roomId) throw Error("Not all data passed");
            const room = socketUtils.rooms.get(roomId);
            if (!room) return;
            if (room.roomDrawing.length >= 1) {
                const lastEl = room.roomDrawing[room.roomDrawing.length - 1];
                const lastStrokeId = lastEl?.strokeId;
                if (!lastStrokeId) return;
                while (room.roomDrawing.length && room.roomDrawing[room.roomDrawing.length - 1]?.strokeId === lastStrokeId) {
                    room.roomDrawing.pop();
                }
                io.to(roomId).emit("erase-canvas");
                io.to(roomId).emit("redraw-canvas", { drawingData: room.roomDrawing });
                socketUtils.emitRoomInfo(io, roomId);
            }
            return;
        })

        socket.on("disconnect", () => {
            const roomId = socket.data.roomId;
            if (roomId) {
                io.to(roomId).emit("user-left", socket.id);
            }
        });
    })
}