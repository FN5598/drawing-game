import { Socket } from "socket.io-client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import LoadingComponent from "../components/LoadingComponent";

type HomePageProps = {
    socket: Socket;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

function HomePage({ socket, loading, setLoading }: HomePageProps) {
    const theme = localStorage.getItem("isLightTheme");

    const navigate = useNavigate();
    const [username, setUsername] = useState<string>(localStorage.getItem("username") || "");

    useEffect(() => {
        socket.on("room-joined", (roomId: string) => {
            navigate(`/canvas/${roomId}`)
            localStorage.setItem("roomId", roomId);
            localStorage.setItem("joined", "true");
        });

        return () => {
            socket.off("room-joined");
        }
    }, [socket, theme, navigate]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        if (name === "username") {
            setUsername(value);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            if (!username) {
                toast.warn("Please type your username!", {
                    position: "top-center",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: `${theme}`
                })
                return;
            }
            localStorage.setItem("username", username);
            socket.emit("set-username", username);
        }
    }

    function handleRoomJoin() {
        if (!username) {
            toast.warn("Please type your username", {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: `${theme}`
            })
            return;
        }
        setLoading(true);
        socket.emit("find-room", { username, isPrivate: false });
    }

    return loading ? (
        <LoadingComponent />
    ) : (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl shadow-lg w-full max-w-sm">
                <h1 className="text-text text-2xl font-semibold text-center mb-6">
                    Join Room
                </h1>

                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-text bg-transparent"
                    placeholder="Enter username"
                    name="username"
                    onChange={handleChange}
                    value={username}
                    onKeyDown={handleKeyDown}
                />

                <button
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 transition text-white font-medium py-2 rounded-lg cursor-pointer"
                    onClick={handleRoomJoin}
                >
                    Join Random Room
                </button>

                <button
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 transition text-white font-medium py-2 rounded-lg cursor-pointer"
                    onClick={() => navigate("/create-room")}
                >
                    Create Room
                </button>
            </div>
        </div>
    );

}


export default HomePage