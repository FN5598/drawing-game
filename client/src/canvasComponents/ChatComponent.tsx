import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { RoomInfo } from "../App";

type ChatComponentProps = {
    socket: Socket;
    wordToGuess?: string;
    setIsGuessed?: React.Dispatch<React.SetStateAction<boolean>>;
    setCanDraw?: React.Dispatch<React.SetStateAction<boolean>>;
    setCanType?: React.Dispatch<React.SetStateAction<boolean>>;
    canDraw: boolean;
    roomInfo: RoomInfo;
}


export function ChatComponent({ socket, wordToGuess, setIsGuessed, setCanDraw, setCanType, roomInfo, canDraw }: ChatComponentProps) {
    const username = localStorage.getItem("username") || "Anonymous";
    const theme = localStorage.getItem("isLightTheme");


    const [input, setInput] = useState("");
    const [data, setData] = useState<string[]>([]);

    useEffect(() => {
        function handleMessage({ msg, username }: { msg: string, username: string }) {
            setData((prevData) => [...prevData, `${username}: ${msg}`]);
        }

        function handleRoomInfo({ currentDrawerId }: { currentDrawerId: string }) {
            const isCurrentDrawer = socket.id === currentDrawerId;
            if (setCanDraw) setCanDraw(isCurrentDrawer);
            if (setCanType) setCanType(!isCurrentDrawer);
        }

        socket.on("message", handleMessage);
        socket.on("room-info", handleRoomInfo);

        // Cleanup listeners on component unmount
        return () => {
            socket.off("message", handleMessage);
            socket.off("room-info", handleRoomInfo);
        };
    }, [socket, theme, setIsGuessed, setCanDraw, setCanType, setData]);

    function sendMessage() {
        if (!input || !username) return;

        if (wordToGuess && setIsGuessed && input.toLowerCase() === wordToGuess.toLowerCase()) {
            socket.emit("message", { msg: `has guessed the word`, username });
            socket.emit("user-guessed-word", { id: socket.id, roomId: roomInfo.roomId });
            setIsGuessed(true);
        } else {
            socket.emit("message", { msg: input, username });
        }
        setInput("");
    }

    function handleSend(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }
    return (
        <div className="flex flex-col text-text w-[400px] h-[500px] bg-bg-light p-2">
            <div className="flex flex-col justify-end flex-1 overflow-y-auto p-4">
                {data.map((message, index) => (
                    <p
                        key={index}
                        className="text-text font-medium"
                    >{message}</p>
                ))}
            </div>

            {!canDraw ? (
                <div
                    className="bg-bg p-2 rounded-2xl overflow-x-clip relative">
                    <textarea
                        className="w-full pt-1 pr-15 rounded resize-none overflow-hidden text-text"
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleSend}
                        placeholder={"Type your message"}
                    />
                    <span
                        className="absolute top-3 right-3"
                    >{input.length}</span>
                </div>) : (
                    <div className="bg-bg p-2 rounded-2xl overflow-x-clip relative">
                        <p className="p-1 text-text-muted">Cannot type while drawing</p>
                    </div>
                )}
        </div>
    )
}