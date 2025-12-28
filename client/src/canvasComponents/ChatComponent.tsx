import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";

type ChatComponentProps = {
    socket: Socket;
    wordToGuess?: string;
    setIsGuessed?: React.Dispatch<React.SetStateAction<boolean>>;
    setCanDraw?: React.Dispatch<React.SetStateAction<boolean>>;
    canType: boolean;
    setCanType?: React.Dispatch<React.SetStateAction<boolean>>;
}


export function ChatComponent({ socket, wordToGuess, setIsGuessed, setCanDraw, canType, setCanType }: ChatComponentProps) {
    const username = localStorage.getItem("username") || "Anonymous";
    const theme = localStorage.getItem("isLightTheme");


    const [input, setInput] = useState("");
    const [data, setData] = useState<string[]>([]);

    useEffect(() => {
        function handleMessage({ msg, username }: { msg: string, username: string }) {
            setData((prevData) => [...prevData, `${username}: ${msg}`]);
            console.log("Sent message");
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

            <div
                className="bg-bg p-2 rounded-2xl overflow-x-clip relative">
                <textarea
                    disabled={!canType}
                    className="w-full pt-1 pr-15 rounded resize-none overflow-hidden text-text"
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleSend}
                    placeholder={canType ? "Type your message" : "Cannot type while drawing"}
                />
                <button
                    className="absolute top-3 right-3 cursor-pointer"
                    type="submit">Submit</button>
            </div>
        </div>
    )
}