import { ChatComponent } from "../canvasComponents/ChatComponent"
import { Socket } from "socket.io-client";
import { useEffect, useContext, useRef } from "react";
import { RoomInfo } from "../App";
import { RoomContext } from "../Contexts/RoomContext";
import { useNavigate, useParams } from "react-router-dom";
import { CurrentPlayersComponent } from "../canvasComponents/CurrentPlayersComponent";
import { RoomCreationComponent } from "../components/RoomCreationComponent";
import copyIcon from "../assets/copy-icon.png";

type RoomPageProps = {
    socket: Socket;
    roomInfo: RoomInfo;
    setRoomInfo: React.Dispatch<React.SetStateAction<RoomInfo>>;
}

export function RoomPage({ socket, roomInfo, setRoomInfo }: RoomPageProps) {

    const username = localStorage.getItem("username");
    const navigate = useNavigate();
    const { roomId } = useParams<{ roomId: string }>();
    const hasJoinedRef = useRef(false);

    const ctx = useContext(RoomContext);
    if (!ctx) throw new Error("RoomContext not found");
    const { canType, setCanType } = ctx;

    useEffect(() => {
        const handleRoomInfo = ({ roomId, members, currentDrawerId, turnEndsAt }: RoomInfo) => {
            console.log("Received room-info:", { roomId, members, currentDrawerId, turnEndsAt });
            setRoomInfo({ roomId, members, currentDrawerId, turnEndsAt });
        };

        setCanType(true);

        socket.on("room-info", handleRoomInfo);

        socket.on("game-started", (roomId: string) => {
            localStorage.setItem("joined", "true");
            navigate(`/canvas/${roomId}`);
        })
        return () => {
            socket.off("room-info", handleRoomInfo);
            socket.off("game-started");
        }
    }, [setCanType, navigate, socket, setRoomInfo, roomInfo])

    console.log(roomId);

    useEffect(() => {
        console.log("Trying to join room", roomId, hasJoinedRef.current);
        if (!roomId || hasJoinedRef.current) return;

        hasJoinedRef.current = true;

        console.log("Room ID params", roomId);

        console.log("emitting join room UI");
        socket.emit("join-room", {
            roomId,
            username
        })

    }, [socket, username, roomId])

    function handleStartGame() {
        socket.emit("start-game", { roomId });
        console.log("Starting game");
    }

    return (
        <div className="flex flex-col min-h-screen bg-bg p-6 justify-center">
            <div className="flex flex-col md:flex-row justify-center items-start md:items-center gap-10 md:gap-20 w-full max-w-7xl mx-auto">
                <CurrentPlayersComponent roomInfo={roomInfo} />

                <RoomCreationComponent socket={socket} setRoomInfo={setRoomInfo} />

                <ChatComponent socket={socket} canType={canType} />
            </div>
            <div className="flex flex-col md:flex-row mt-12 items-center justify-center gap-6 md:gap-12">
                {/* Room Link Section */}
                <div className="flex items-center bg-bg-light shadow-lg rounded-xl px-6 py-4 gap-3">
                    <code className="text-lg md:text-2xl font-semibold text-text-muted break-all">
                        Room Link:{" "}
                        <span className="text-primary">{`${import.meta.env.VITE_UI_URL}/room/${roomId}`}</span>
                    </code>

                    <img
                        onClick={() => {
                            navigator.clipboard.writeText(`${import.meta.env.VITE_UI_URL}/room/${roomId}`);
                        }}
                        className="cursor-pointer w-6 h-6 hover:scale-110 transition-transform"
                        src={copyIcon}
                        alt="Copy link"
                    />
                </div>

                {/* Start Game Button */}
                <button
                    onClick={handleStartGame}
                    className="bg-success text-white rounded-xl text-xl md:text-3xl px-6 py-3 hover:bg-success-dark transition cursor-pointer">
                    Start Game
                </button>
            </div>

        </div>

    )
}