import { RoomState } from "../types/RoomState";
import { Server, Socket } from "socket.io";
import { fetchRandomWord } from "../utils/fetchRandomWord";

export const rooms = new Map<string, RoomState>();
export const roomWords = new Map<string, string>();

export function startRoomTurn(io: Server, roomId: string) {
    if (!io || !roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.turnTimeout) {
        clearTimeout((room.turnTimeout));
    }

    const turnTime = room.turnTime
    room.turnEndsAt = Date.now() + turnTime;

    room.turnTimeout = setTimeout(() => {
        io.to(roomId).emit("next-player");


        room.turnTimeout = null;
        startRoomTurn(io, roomId);
    }, turnTime);
}

export function createRoom(isPrivate: boolean, maxPlayers?: number, turnTime?: number): RoomState | undefined {
    if (isPrivate === undefined) return;
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

export function emitRoomInfo(io: Server, roomId: string) {
    if (!io || !roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const members = room.members.map((member) => {
        return {
            id: member.id,
            username: member.username
        }
    });

    const currentDrawerId = room.members[room.currentDrawerIndex];
    io.to(roomId).emit("room-info", {
        roomId,
        members,
        currentDrawerId: currentDrawerId?.id,
        turnEndsAt: room.turnEndsAt,
        turnTime: room.turnTime,
        maxPlayers: room.maxPlayers
    });
}

export function findAvailableRoom(): RoomState | undefined {
    for (const room of rooms.values()) {
        if ((room.members.length < room.maxPlayers) && !room.isPrivate) {
            return room;
        }
    }
    return undefined;
}

export async function nextPlayerDrawing(roomId: string, socket: Socket, io: Server) {
    if (!roomId || !socket || !io) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.roomDrawing = []
    if (room.members.length <= 1) {
        leaveRoom(io, roomId, socket);
        socket.emit("not-enough-players");
        return;
    };

    if (room.currentDrawerIndex >= room.members.length - 1) {
        room.currentDrawerIndex = 0;
    } else {
        room.currentDrawerIndex += 1;
    }
    startRoomTurn(io, roomId);

    const wordObj = await fetchRandomWord();
    const wordToGuess = wordObj?.word;
    if (wordToGuess) {
        roomWords.set(roomId, wordToGuess);
    }

    io.to(roomId).emit("word-to-guess", wordToGuess);
    io.to(roomId).emit("erase-canvas");

    emitRoomInfo(io, roomId);
}

export function leaveRoom(io: Server, roomId: string, socket: Socket) {
    if (!io || !roomId || !socket) return;
    const room = rooms.get(roomId);
    if (!room) return;

    socket.leave(roomId);
    socket.emit("left-room");
    socket.data.roomId = null;
    room.members = room.members.filter(member => member.id !== socket.id);

    if (room.members.length > 1) {
        nextPlayerDrawing(roomId, socket, io);
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

    if (room.members.length === 0) return;
    emitRoomInfo(io, roomId);
    io.to(roomId).emit("user-left", socket.id);
}

export async function joinRoom(roomId: string, socket: Socket, username: string, io: Server) {
    if (!roomId || !socket || !username || !io) return;
    const room = rooms.get(roomId);
    if (!room) return;
    socket.join(roomId);

    if (!room?.turnEndsAt) {
        startRoomTurn(io, roomId);
    }

    socket.data.username = username;
    socket.data.roomId = roomId;

    if (!room.members.some(member => member.id === socket.id)) {
        room.members.push({ id: socket.id, username });
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
    emitRoomInfo(io, roomId);
}