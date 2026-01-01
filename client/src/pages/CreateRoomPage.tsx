import { Socket } from "socket.io-client";
import { RoomInfo } from "../App";
import { RoomCreationComponent } from "../components/RoomCreationComponent";

type CreateRoomPageProps = {
    socket: Socket;
    setRoomInfo: React.Dispatch<React.SetStateAction<RoomInfo>>;
}

export function CreateRoomPage({ socket, setRoomInfo }: CreateRoomPageProps) {

    return (
        <div className="flex justify-center items-center min-h-screen bg-bg gap-20">

            <RoomCreationComponent socket={socket} setRoomInfo={setRoomInfo} />

        </div>
    )
}

export default CreateRoomPage