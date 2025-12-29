import { DrawData } from "./DrawData";

export type RoomState = {
    roomId: string
    members: string[];
    currentDrawerIndex: number;
    turnEndsAt: number | null;
    maxPlayers: number;
    turnTimeout?: NodeJS.Timeout | null;
    isPrivate: boolean;
    turnTime: number;
    guessedMembers: string[];
    roomDrawing: DrawData[];
};