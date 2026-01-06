import { DrawData } from "./DrawData";

export type Member = {
    id: string,
    username: string
}

export type RoomState = {
    roomId: string
    members: Member[];
    currentDrawerIndex: number;
    turnEndsAt: number | null;
    maxPlayers: number;
    turnTimeout?: NodeJS.Timeout | null;
    isPrivate: boolean;
    turnTime: number;
    guessedMembers: string[];
    roomDrawing: DrawData[];
};