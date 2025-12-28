import { createContext } from "react";

export type RoomContextType = {
    canType: boolean;
    setCanType: React.Dispatch<React.SetStateAction<boolean>>;
};

export const RoomContext = createContext<RoomContextType | undefined>(undefined);