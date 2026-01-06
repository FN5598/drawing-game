import { useEffect, useState } from "react";
import { RoomInfo } from "../App";

type SettingsProps = {
    onClose: () => void;
    roomInfo: RoomInfo;
};

export function SettingsModal({ onClose, roomInfo }: SettingsProps) {
    const [theme, setTheme] = useState<boolean>(localStorage.getItem("isLightTheme") === "dark" || false);
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    function changeTheme() {
        let currentTheme = '';
        const theme = document.documentElement.classList.toggle("light");
        if (theme == true) currentTheme = "light"
        localStorage.setItem("isLightTheme", currentTheme || "dark");
        setTheme(prev => !prev);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 bg-white dark:bg-gray-800 rounded-xl p-6 w-[400px] shadow-xl space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Settings
                </h2>

                {/* Theme Switch */}
                <div className="flex items-center justify-between font-bold">
                    <span className="text-text">Theme</span>
                    <button
                        className="cursor-pointer border-border-color border p-2 rounded-md bg-bg w-23 text-text font-bold"
                        onClick={changeTheme}
                    >
                        {!theme ? "Light" : "Dark"}
                    </button>
                </div>

                {/* Show Controls on Ctrl+Z */}
                <div className="flex items-center justify-between text-text font-bold">
                    <span >
                        Revert previous draw
                    </span>
                    <code>
                        Ctrl + z
                    </code>
                </div>

                {/* Max Players */}
                <div className="flex items-center justify-between text-text font-bold">
                    <span className="">Max Players</span>
                    <span>{roomInfo.maxPlayers}</span>
                </div>

                {/* Time per Round */}
                <div className="flex items-center justify-between text-text font-bold">
                    <span className="">
                        Time per Round
                    </span>
                    <span>{Number(roomInfo.turnTime) / 1000} seconds</span>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-4 justify-center">
                    <button
                        onClick={onClose}
                        className="bg-blue-700 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg transition cursor-pointer pl-10 pr-10"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
