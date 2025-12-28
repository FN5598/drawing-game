import { RoomInfo } from "../App"
import { useParams } from "react-router-dom"


type CurrentPlayersComponentProps = {
    roomInfo: RoomInfo
}

export function CurrentPlayersComponent({ roomInfo }: CurrentPlayersComponentProps) {

    const { roomId } = useParams();
    const username = localStorage.getItem("username");

    return (
        <div className="flex text-center flex-col w-[400px] mt-auto mb-auto">
            <div className="flex justify-center relative">
                {roomId && (
                    <div className="text-text bg-bg p-2 rounded mb-2">
                        <p>Room ID: {roomInfo?.roomId}</p>
                    </div>
                )}

            </div>
            <div className="items-start justify-center flex-col bg-bg-light p-2 rounded-lg h-[500px]">
                <p className="text-text-muted text-4xl font-bold mb-4">Current Players:</p>
                {!roomId ?
                    <p className="text-3xl text-text-muted">{username} <span className="text-2xl font-bold">(You)</span></p>
                    :
                    roomInfo?.members?.map((member) =>
                        <p
                            className={`text-3xl ${member.id === roomInfo?.currentDrawerId ? `font-bold text-text-muted` : `text-text-muted`}`}
                            key={member.id}
                        >{member.username} <span className="text-2xl font-bold">{member.username === username ? "(You)" : ""}</span></p>
                    )
                }
            </div>
        </div>
    )
}