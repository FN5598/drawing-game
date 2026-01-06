import { ColorPickerComponent } from "../canvasComponents/ColorPickerComponent";
import { useRef, useState, useEffect } from "react"
import { Socket } from "socket.io-client";
import transformWordToLetters from "../utils/transformWordToLetters";
import { RoomInfo } from "../App";
import eraserIcon from "../assets/eraser-icon.png"
import brushIcon from "../assets/pen-icon.png"

type CanvasComponentProps = {
    socket: Socket;
    setWordToGuess: React.Dispatch<React.SetStateAction<string>>;
    wordToGuess: string;
    roomInfo: RoomInfo
    isGuessed: boolean;
    canDraw: boolean;
    timeLeft: number | "Loading ...";
}

interface DrawData {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    lineWidth: number;
    isEraser: boolean;
}


const FPS = 45;
const interval = 1000 / FPS;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function CanvasComponent({ socket, wordToGuess, setWordToGuess, isGuessed, canDraw, timeLeft }: CanvasComponentProps) {

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [lineWidth, setLineWidth] = useState(3);
    const [drawing, setDrawing] = useState(false);
    const [color, setColor] = useState("#000000");

    const lastPosRef = useRef<{ x: number, y: number } | null>(null);
    const lastEmitRef = useRef(0);

    const [isEraser, setIsEraser] = useState(false);
    const [colorPicker, setColorPicker] = useState(false);

    const roomId = localStorage.getItem("roomId") || undefined;

    useEffect(() => {

        function handleDraw(data: DrawData) {

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!ctx) return;

            const { x1, y1, x2, y2, color, lineWidth, isEraser } = data;
            if (isEraser) {
                ctx.globalCompositeOperation = "destination-out";
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = "rgba(0,0,0,1)";
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineCap = "round";
                ctx.stroke();
                ctx.globalCompositeOperation = "source-over";
            } else {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = "round";
                ctx.stroke();
            }
        }

        function handleErasePage() {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas?.getContext("2d");
            if (!ctx) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        function handleWord(word: string) {
            setWordToGuess(word);
        }

        function handleSendDrawingData({ drawingData }: { drawingData: DrawData[] }) {
            drawingData.map(data => {
                handleDraw(data);
            })
        }

        socket.on("draw", handleDraw);
        socket.on("erase-canvas", handleErasePage);
        socket.on("word-to-guess", handleWord);
        socket.on("current-drawing", handleSendDrawingData)

        return () => {
            socket.off("draw", handleDraw);
            socket.off("erase-canvas", handleErasePage);
            socket.off("word-to-guess", handleWord);
            socket.off("user-left");
        };
    }, [socket, setWordToGuess]);

    // Request word when component mounts or room is joined
    useEffect(() => {
        // If already in a room, request word immediately
        if (roomId) {
            socket.emit("get-word");
        }

        function handleRoomJoined() {
            socket.emit("get-word");
        }

        socket.on("room-joined", handleRoomJoined);

        return () => {
            socket.off("room-joined", handleRoomJoined);
        };
    }, [socket, roomId]);

    function getCursorPos(e: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!drawing) return;
        if (!canDraw) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const pos = getCursorPos(e);
        if (!ctx || !pos) return;

        const now = Date.now();
        if (now - lastEmitRef.current < interval) return;
        lastEmitRef.current = now;

        if (lastPosRef.current) {
            if (isEraser === false) {
                ctx.beginPath();
                ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = "round";
                ctx.stroke();
            } else if (isEraser === true) {
                ctx.globalCompositeOperation = "destination-out";
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = "rgba(0,0,0,1)";
                ctx.beginPath();
                ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                ctx.globalCompositeOperation = "source-over";
            }
            socket.emit("draw", {
                x1: lastPosRef.current.x,
                y1: lastPosRef.current.y,
                x2: pos.x,
                y2: pos.y,
                color,
                lineWidth,
                isEraser
            });
        }
        lastPosRef.current = pos;
    }

    function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        setDrawing(true);
        const pos = getCursorPos(e);
        if (!pos) return;
        lastPosRef.current = pos;
    }

    function handleMouseUp() {
        setDrawing(false);
        lastPosRef.current = null;
    }

    function clearCanvas() {
        socket.emit("erase-canvas");
    }

    return (
        <div className="text-text flex flex-col justify-center p-10">
            <div className="flex justify-center text-2xl relative">
                <h1 className="absolute left-0 bottom-0.5 text-4xl text-text">{`Time left: ${timeLeft}`}</h1>
                {wordToGuess && (transformWordToLetters(wordToGuess)?.map((char, index) => (
                    canDraw ?
                        <div key={index} className={`inline-block w-5 mr-1 ${char !== " " ? `border-b border-b-blue-100` : `border-0`} text-center`}>
                            {char}
                        </div>
                        :
                        <div key={index} className={`inline-block w-5 mr-1 ${char !== " " ? `border-b border-b-blue-100` : `border-0`} text-center`}>
                            <p className={`${isGuessed ? `text-white` : `text-transparent select-none`}`}>{char}</p>
                        </div>
                )))
                }
            </div>

            <canvas
                style={{
                    width: `${CANVAS_WIDTH}px`,
                    height: `${CANVAS_HEIGHT}px`,
                    display: 'block'
                }}
                className="border-8 border-gray-600 rounded-xl bg-canvas cursor-pointer w-[800px] h-[600px] mt-4.5 "
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                aria-disabled={!canDraw}
            ></canvas>

            {canDraw && (
                <div className="flex gap-4 items-center mb-4">
                    <label htmlFor="lineWidth">Line Width:</label>
                    <input
                        id="lineWidth"
                        type="range"
                        min="1"
                        max="20"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                        className="cursor-pointer"
                    />
                    <span>{lineWidth}px</span>

                    <label htmlFor="colorPicker">Color:</label>
                    <div
                        onMouseEnter={() => setTimeout(() => setColorPicker(true), 100)}
                        className="w-6 h-6 cursor-pointer"
                        onClick={() => setColorPicker(prev => !prev)}
                        style={{ backgroundColor: color || "white" }}
                        id="colorPicker"></div>
                    <div className="relative">
                        <div
                            className={colorPicker ? "flex absolute -left-6 -top-55" : "hidden"}
                            onMouseLeave={() => setTimeout(() => setColorPicker(false), 100)}>
                            <ColorPickerComponent color={color} setColor={setColor} />
                        </div>
                    </div>

                    <button
                        className="border border-border-color p-1 rounded-lg mt-2 cursor-pointer bg-bg text-text"
                        onClick={clearCanvas}
                    >Clear canvas</button>

                    <img
                        className="border border-border-color p-1 rounded-lg mt-2 cursor-pointer bg-bg text-text"
                        onClick={() => setIsEraser(prev => !prev)}
                        src={isEraser ? eraserIcon : brushIcon}
                    />
                </div>
            )}
        </div >
    )
}