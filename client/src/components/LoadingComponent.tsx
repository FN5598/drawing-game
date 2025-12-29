import { FourSquare } from "react-loading-indicators";

function LoadingComponent() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-bg">
            <div className="flex flex-col items-center space-y-4">
                <FourSquare color="#32cd32" size="medium" />
                <p className="text-gray-300 text-lg font-medium">Loading...</p>
            </div>
        </div>
    );
}

export default LoadingComponent;
