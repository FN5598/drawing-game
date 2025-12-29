import { ChatComponent } from "../canvasComponents/ChatComponent"
import { Socket } from "socket.io-client";
import { useEffect, useContext } from "react";
import { RoomInfo } from "../App";
import { RoomContext } from "../Contexts/RoomContext";
import { CurrentPlayersComponent } from "../canvasComponents/CurrentPlayersComponent";
import { RoomCreationComponent } from "../components/RoomCreationComponent";

type CreateRoomPageProps = {
    socket: Socket;
    roomInfo: RoomInfo;
    setRoomInfo: React.Dispatch<React.SetStateAction<RoomInfo>>;
}

export function CreateRoomPage({ socket, roomInfo, setRoomInfo }: CreateRoomPageProps) {
    const ctx = useContext(RoomContext);
    if (!ctx) throw new Error("RoomContext not found");
    const { canType, setCanType } = ctx;

    useEffect(() => {
        setCanType(true);
    }, [setCanType]);

    return (
        <div className="flex justify-center items-center min-h-screen bg-bg gap-20">

            <CurrentPlayersComponent roomInfo={roomInfo} />

            <RoomCreationComponent socket={socket} setRoomInfo={setRoomInfo} />

            <ChatComponent
                socket={socket}
                canType={canType}
                roomInfo={roomInfo}
            />
        </div>
    )
}

export default CreateRoomPage