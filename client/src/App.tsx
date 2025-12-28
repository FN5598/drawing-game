import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ToastContainer } from 'react-toastify';
import { useEffect, useState } from 'react';
import { CanvasPage } from "./pages/CanvasPage";
import { io, Socket } from "socket.io-client";
import { CreateRoomPage } from './pages/CreateRoomPage';
import { RoomPage } from './pages/RoomPage';
import { RoomContext } from './Contexts/RoomContext';

export type RoomInfo = {
  roomId: number | "Loading ...";
  members?: { id: string, username: string }[]
  currentDrawerId?: string;
  turnEndsAt: number | "Loading ...";
}

const socket: Socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", { autoConnect: true });

function App() {
  const [canDraw, setCanDraw] = useState<boolean>(false)
  const [canType, setCanType] = useState(true);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>({
    roomId: "Loading ...",
    turnEndsAt: "Loading ..."
  });

  useEffect(() => {
    const isLightTheme = localStorage.getItem("isLightTheme");
    if (isLightTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }

    localStorage.setItem("joined", "false");
  }, []);


  return (
    <>
      {/* Alert Pop Up */}
      <ToastContainer
        position="top-center"
        autoClose={5000}
        limit={1}
        hideProgressBar={false}
        newestOnTop
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />


      {/* All Routes */}
      <Routes>
        <Route index element={<HomePage
          socket={socket} />} />

        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign-up" element={<SignupPage />} />

        <Route path="/canvas/:roomId" element={<RoomContext.Provider value={{ setCanType, canType }}><CanvasPage
          socket={socket}
          setRoomInfo={setRoomInfo}
          roomInfo={roomInfo}
          setCanDraw={setCanDraw}
          canDraw={canDraw}
        /> </RoomContext.Provider>}
        />

        <Route path="/create-room" element={<RoomContext.Provider value={{ setCanType, canType }}> <CreateRoomPage
          socket={socket}
          roomInfo={roomInfo}
          setRoomInfo={setRoomInfo}
        /> </RoomContext.Provider>} />

        <Route path="/room/:roomId" element={<RoomContext.Provider value={{ setCanType, canType }}> <RoomPage
          socket={socket}
          roomInfo={roomInfo}
          setRoomInfo={setRoomInfo}
        /> </RoomContext.Provider>} />
      </Routes>
    </>
  );
}
export default App