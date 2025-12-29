import type { Socket } from "socket.io-client";
import { CanvasComponent } from "../canvasComponents/CanvasComponent";
import { ChatComponent } from "../canvasComponents/ChatComponent";
import { useEffect, useState, useContext } from "react";
import { RoomContext } from "../Contexts/RoomContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import settingsIcon from "../assets/settings.png";
import { RoomInfo } from "../App";
import { CurrentPlayersComponent } from "../canvasComponents/CurrentPlayersComponent";

type CanvasPageProps = {
    socket: Socket;
    roomInfo: RoomInfo
    setRoomInfo: React.Dispatch<React.SetStateAction<RoomInfo>>;
    setCanDraw: React.Dispatch<React.SetStateAction<boolean>>;
    canDraw: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

function CanvasPage({ socket, roomInfo, setRoomInfo, setCanDraw, canDraw, setLoading}: CanvasPageProps) {
    const navigate = useNavigate();
    const [wordToGuess, setWordToGuess] = useState<string>('');
    const [isGuessed, setIsGuessed] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | "Loading ...">("Loading ...");

    const ctx = useContext(RoomContext);
    if (!ctx) throw new Error("RoomContext not found");
    const { canType, setCanType } = ctx;

    const theme = localStorage.getItem("isLightTheme");
    const username = localStorage.getItem("username");
    const joined = localStorage.getItem("joined") === "true";


    useEffect(() => {
        const handleBeforeUnload = () => {
            if (joined) {
                socket.emit("leave-room");
                localStorage.setItem("joined", "false")
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [socket, joined]);

    useEffect(() => {
        const handleRoomInfo = ({ roomId, members, currentDrawerId, turnEndsAt }: RoomInfo) => {
            setRoomInfo({ roomId, members, currentDrawerId, turnEndsAt });
        };

        function handleLeaveRoom() {
            toast.info("You have left the room.", {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: `${theme}`
            });
            navigate(`/`);
        }

        if (!joined) navigate("/");

        function handleNextPlayer() {
            const playerUsername = roomInfo.members?.find(member => member.id === roomInfo.currentDrawerId)?.username;
            socket.emit("message", { msg: "is the next player drawing", username: playerUsername });
        }

        function handleNotEnoughPlayers() {
            navigate("/");
            toast.info("Left the room! Not enough players to continue the game", {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: `${theme}`
            })
        }

        function handleAllGuessed() {
            setIsGuessed(false);
            toast.info("All players guessed! Drawing next word", {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: `${theme}`
            })
        }

        socket.on("left-room", handleLeaveRoom);
        socket.on("room-info", handleRoomInfo);
        socket.on("next-player", handleNextPlayer);
        socket.on("not-enough-players", handleNotEnoughPlayers)
        socket.on("all-players-guessed", handleAllGuessed);

        return () => {
            socket.off("room-info", handleRoomInfo);
            socket.off("left-room", handleLeaveRoom);
            socket.off("next-player", handleNextPlayer);
            socket.off("not-enough-players");
        }
    }, [navigate, socket, theme, roomInfo.currentDrawerId, roomInfo.members, setRoomInfo, joined]);


    useEffect(() => {
        socket.emit("make-word");

        socket.emit("get-room-info");

        setLoading(false);
    }, [socket, setLoading]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const timeLeftMs = +roomInfo.turnEndsAt - now;

            const secondsLeft = Math.max(0, timeLeftMs / 1000);

            setTimeLeft(Math.floor(secondsLeft));

            if (secondsLeft <= 0) {
                setIsGuessed(false);
                socket.emit("get-room-info");
                socket.emit("next-player");
            }
        }, 250);

        return () => clearInterval(interval);
    }, [roomInfo.turnEndsAt, socket]);

    function handleLeave() {
        socket.emit("message", { msg: `has left the game`, username });
        socket.emit("leave-room");
    }

    return (
        <div className="flex flex-row gap-5 bg-bg-canvas h-screen justify-center">

            <CurrentPlayersComponent roomInfo={roomInfo} />

            <CanvasComponent
                socket={socket}
                setWordToGuess={setWordToGuess}
                wordToGuess={wordToGuess}
                roomInfo={roomInfo}
                isGuessed={isGuessed}
                canDraw={canDraw}
                timeLeft={timeLeft}
            />

            <div className="flex gap-2 flex-col justify-center">
                <div className="flex flex-row gap-2 justify-center">
                    <button
                        onClick={() => handleLeave()}
                        className="text-text bg-warning hover:bg-danger transition-all p-2 rounded cursor-pointer">Leave room</button>
                    <div className="text-text bg-bg p-2 rounded">
                        <p>Members: {roomInfo?.members?.length}</p>
                    </div>
                    <div className="text-text bg-bg p-2 rounded cursor-pointer">
                        <img src={settingsIcon} />
                    </div>
                </div>
                <ChatComponent
                    socket={socket}
                    wordToGuess={wordToGuess}
                    setIsGuessed={setIsGuessed}
                    setCanDraw={setCanDraw}
                    canType={canType}
                    setCanType={setCanType}
                    roomInfo={roomInfo}
                />
            </div>
        </div>
    );
} 

export default CanvasPage