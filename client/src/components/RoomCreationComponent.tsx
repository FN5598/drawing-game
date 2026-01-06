import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Socket } from "socket.io-client";
import { RoomInfo } from "../App";
import { toast } from "react-toastify";

type RoomCreationComponentProps = {
    socket: Socket;
    setRoomInfo: React.Dispatch<React.SetStateAction<RoomInfo>>;
}

export function RoomCreationComponent({ socket, setRoomInfo }: RoomCreationComponentProps) {

    const username = localStorage.getItem("username");
    const [maxPlayers, setMaxPlayers] = useState(3);
    const [turnTime, setTurnTime] = useState(80);
    const navigate = useNavigate();
    const { roomId } = useParams();
    const theme = localStorage.getItem("isLightTheme")

    useEffect(() => {

        const handleRoomInfo = ({ roomId, members, currentDrawerId, turnEndsAt, turnTime, maxPlayers }: RoomInfo) => {
            setRoomInfo({ roomId, members, currentDrawerId, turnEndsAt, turnTime, maxPlayers });
        };

        function handleLeaveRoom() {
            toast.info("You have left the room.", {
                position: "top-center",
                autoClose: 500,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: `${theme}`
            });
            navigate(`/`);
        }

        socket.on("room-info", handleRoomInfo);
        socket.on("left-room", handleLeaveRoom);

        socket.on("private-room-created", (roomId: string) => {
            navigate(`/room/${roomId}`);
        })

        return () => {
            socket.off("private-room-created");
            socket.off("left-room", handleLeaveRoom);
        }
    }, [navigate, socket, theme, setRoomInfo])

    function handleRoomCreation() {
        const turnTimeMs = turnTime * 1000;
        socket.emit("create-private-room", { username, maxPlayers, turnTime: turnTimeMs }, (roomId: string) => {

            socket.emit("join-room", { roomId, username });

            navigate(`/room/${roomId}`);
        });
    }

    function handleCancel() {
        if (roomId) {
            socket.emit("leave-room");
        } else {
            navigate('/');
        }
    }

    return (
        <div className="flex flex-col gap-6 bg-bg-light p-8 rounded-2xl shadow-lg w-full max-w-md">

            <h1 className="text-2xl font-semibold text-text text-center mb-4">
                Room Settings
            </h1>

            {/* Max Players */}
            <div className="flex flex-col gap-1">
                <label className="text-text font-medium">Max Players</label>
                <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="p-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:ring-2 focus:ring-primary">
                    {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                    ))}
                </select>
            </div>

            {/* Time to Draw */}
            <div className="flex flex-col gap-1">
                <label className="text-text font-medium">Time to Draw (seconds)</label>
                <select
                    value={turnTime}
                    onChange={(e) => setTurnTime(Number(e.target.value))}
                    className="p-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:ring-2 focus:ring-primary">
                    {[15, 30, 60, 80, 100, 120, 140].map(time => (
                        <option key={time} value={time}>{time}</option>
                    ))}
                </select>
            </div>

            {/* Room Description */}
            <div className="flex flex-col gap-1">
                <label className="text-text font-medium">Custom Words</label>
                <textarea
                    className="p-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none h-24"
                    placeholder="Add a description..."
                />
            </div>

            <button
                onClick={handleRoomCreation}
                className="bg-blue-700 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg transition cursor-pointer">
                Create Room
            </button>

            <button
                onClick={handleCancel}
                className="bg-warning hover:bg-warning-hover text-white font-semibold py-2 rounded-lg transition cursor-pointer">
                {roomId ? "Leave Room" : "Cancel"}
            </button>

        </div>
    )
}