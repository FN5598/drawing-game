import { Server, Socket } from "socket.io";
import * as socketUtils from "../../server/socketUtils";
import { fetchRandomWord } from "../../utils/fetchRandomWord";

let socket: any;
let io: any;
let socket2: any;
let io2: any;

jest.mock("../../utils/fetchRandomWord", () => ({
    fetchRandomWord: jest.fn()
}));

describe("socketUtils", () => {
    const mockSocket = () => ({
        id: "socket1",
        join: jest.fn(),
        emit: jest.fn(),
        leave: jest.fn(),
        data: {} as any
    })

    const mockIo = () => {
        const roomEmitter = { emit: jest.fn() };
        return {
            to: jest.fn(() => roomEmitter),
            emit: jest.fn(),
            __roomEmitter: roomEmitter
        } as any
    };


    beforeEach(() => {
        socketUtils.rooms.clear();
        socketUtils.roomWords.clear();
        socket = mockSocket();
        io = mockIo();
        socket2 = mockSocket();
        socket2.id = "socket2";
        io2 = mockIo();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
        jest.clearAllMocks();
    })

    describe("createRoom", () => {
        test("creates empty public room", () => {
            const room = socketUtils.createRoom(false);
            expect(room!.isPrivate).toBe(false);
            expect(socketUtils.rooms.get(room!.roomId)).toBe(room);
        });
        test("creates private room with custom data", () => {
            const room = socketUtils.createRoom(true, 2, 30);
            expect(room!.isPrivate).toBe(true);
            expect(room!.maxPlayers).toBe(2);
            expect(room!.turnTime).toBe(30);
            expect(socketUtils.rooms.get(room!.roomId)).toBe(room);
        })
    })

    describe("findAvailibleRoom", () => {
        test("returns existing availible room", () => {
            const room = socketUtils.createRoom(false);
            const found = socketUtils.findAvailableRoom();
            expect(found).toBe(room);
        });
        test("returns undefined if no rooms found", () => {
            const found = socketUtils.findAvailableRoom();
            expect(found).toBeUndefined();
        })
    })

    describe("joinRoom", () => {
        (fetchRandomWord as jest.Mock).mockResolvedValue({
            id: 1,
            word: "testword",
        })
        jest.spyOn(socketUtils, "startRoomTurn").mockImplementation(() => { });
        test("adds socket to the room and emits correct events", async () => {
            const room = socketUtils.createRoom(false);
            await socketUtils.joinRoom(room!.roomId, socket as any, "Alice", io as any);

            expect(socketUtils.rooms.get(room!.roomId)?.members.find(member => member.id === socket.id)).toStrictEqual({ id: socket.id, username: socket.data.username })

            expect(socket.data.username).toBe("Alice");
            expect(socket.data.roomId).toBe(room!.roomId);

            expect(socket.emit).toHaveBeenCalledWith("room-joined", room!.roomId)
            expect(socket.join).toHaveBeenCalledTimes(1);

            expect(socketUtils.roomWords.has(room!.roomId)).toBe(true);
            expect(socketUtils.roomWords.get(room!.roomId)).toBe("testword");

            expect(socket.emit).toHaveBeenCalledWith("room-joined", room!.roomId);
        })
        test("if one of parameters missing return", async () => {
            const room = socketUtils.createRoom(false);
            await socketUtils.joinRoom(room!.roomId, socket as any, undefined as any, io as any);

            expect(socketUtils.rooms.get(room!.roomId)?.members.find(member => member.id === socket.id)).toBeUndefined();
            expect(socket.join).not.toHaveBeenCalled();
            expect(socket.emit).not.toHaveBeenCalled();
            expect(socket.data.username).toBeUndefined();
            expect(socket.data.roomId).toBeUndefined();
            expect(socket.emit).not.toHaveBeenCalled();
        })
    })

    describe("leaveRoom", () => {
        beforeEach(() => {
            (fetchRandomWord as jest.Mock).mockResolvedValue({
                id: 1,
                word: "testword",
            })
            jest.spyOn(socketUtils, "startRoomTurn").mockImplementation(() => { });
            jest.spyOn(socketUtils, "emitRoomInfo").mockImplementation(() => { });
            jest.spyOn(socketUtils, "nextPlayerDrawing").mockResolvedValue(undefined);
        })

        test("removes user socket from room", async () => {
            const room = socketUtils.createRoom(false);
            await socketUtils.joinRoom(room!.roomId, socket, "Alice", io);

            socketUtils.leaveRoom(io as any, room!.roomId, socket as any);

            expect(socket.leave).toHaveBeenCalledTimes(1);
            expect(socket.emit).toHaveBeenCalledWith("left-room");
            expect(socket.data.roomId).toBeNull();
            expect(room!.members.filter(member => member.id === socket.id)).toEqual([]);
            expect(room!.members.length).toEqual(0);
            expect(room!.turnTimeout).toBeNull();
            expect(socketUtils.rooms.has(room!.roomId)).toBe(false)
            expect(io.__roomEmitter.emit).not.toHaveBeenCalledWith("user-left", socket.id);
        })
    })

    describe("nextPlayerDrawing", () => {
        jest.spyOn(socketUtils, "startRoomTurn").mockImplementation(() => { });
        jest.spyOn(socketUtils, "emitRoomInfo").mockImplementation(() => { });
        (fetchRandomWord as jest.Mock).mockResolvedValue({
            id: 1,
            word: "testword",
        })

        test("2 players in room gives drawing permission to next player", async () => {
            const room = socketUtils.createRoom(false);
            await socketUtils.joinRoom(room!.roomId, socket as any, "Alice", io as any);
            await socketUtils.joinRoom(room!.roomId, socket2 as any, "Bob", io2 as any);

            await socketUtils.nextPlayerDrawing(room!.roomId, socket as any, io as any);

            expect(room!.currentDrawerIndex).toEqual(1);
            expect(socketUtils.roomWords.has(room!.roomId)).toBe(true);

            expect(io.__roomEmitter.emit).toHaveBeenCalledWith("word-to-guess", "testword");
            expect(io.__roomEmitter.emit).toHaveBeenCalledWith("erase-canvas");
            expect(io.__roomEmitter.emit).not.toHaveBeenCalledWith("not-enough-players");
        })

        test("1 player in room kicks user from room and deletes room", async () => {
            const room = socketUtils.createRoom(false);
            await socketUtils.joinRoom(room!.roomId, socket as any, "Alice", io as any);

            await socketUtils.nextPlayerDrawing(room!.roomId, socket as any, io as any);

            expect(socket.emit).toHaveBeenCalledWith("not-enough-players");
            expect(room!.members.length).toEqual(0);
            expect(socketUtils.rooms.has(room!.roomId)).toBeFalsy();
        })
    })
})