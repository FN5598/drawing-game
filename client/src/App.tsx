import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useEffect, useState, Suspense, lazy } from 'react';
import { io, Socket } from "socket.io-client";
import { RoomContext } from './Contexts/RoomContext';
import LoadingComponent from "./components/LoadingComponent"

export type RoomInfo = {
  roomId: number | "Loading ...";
  members?: { id: string, username: string }[]
  currentDrawerId?: string;
  turnEndsAt: number | "Loading ...";
  turnTime: number | "Loading ...";
  maxPlayers: number | "Loading ...";
}

const socket: Socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: true
})

const RoomPage = lazy(() => import("./pages/RoomPage"));
const CreateRoomPage = lazy(() => import('./pages/CreateRoomPage'));
const CanvasPage = lazy(() => import("./pages/CanvasPage"));
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));

function App() {
  const [loading, setLoading] = useState(false);
  const [canDraw, setCanDraw] = useState<boolean>(false)
  const [canType, setCanType] = useState(true);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>({
    roomId: "Loading ...",
    turnEndsAt: "Loading ...",
    turnTime: "Loading ...",
    maxPlayers: "Loading ..."
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
      <Suspense fallback={<LoadingComponent />}>
        <Routes>
          <Route index element={<HomePage
            socket={socket}
            loading={loading}
            setLoading={setLoading}
          />} />

          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sign-up" element={<SignupPage />} />

          <Route path="/canvas/:roomId" element={<RoomContext.Provider value={{ setCanType, canType }}><CanvasPage
            socket={socket}
            setRoomInfo={setRoomInfo}
            roomInfo={roomInfo}
            setCanDraw={setCanDraw}
            canDraw={canDraw}
            setLoading={setLoading}
          /> </RoomContext.Provider>}
          />

          <Route path="/create-room" element={<RoomContext.Provider value={{ setCanType, canType }}> <CreateRoomPage
            socket={socket}
            setRoomInfo={setRoomInfo}
          /> </RoomContext.Provider>} />

          <Route path="/room/:roomId" element={<RoomContext.Provider value={{ setCanType, canType }}> <RoomPage
            socket={socket}
            roomInfo={roomInfo}
            setRoomInfo={setRoomInfo}
            canDraw={canDraw}
            setCanDraw={setCanDraw}
          /> </RoomContext.Provider>} />
        </Routes>
      </Suspense>
    </>
  );
}
export default App