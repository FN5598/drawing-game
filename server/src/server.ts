import dotenv from "dotenv";
import connectDB from "./config/connectDB";
import { setupSwagger } from "./config/swagger";
import { createServer } from "./utils/createServer"

dotenv.config();
connectDB();
const { server, app } = createServer();

setupSwagger(app);

server.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT}`);
})