import cookieParser from "cookie-parser";
import express from "express";
import authRoutes from "../routes/authRoutes";
import userRoutes from "../routes/userRoutes";

export function createApp() {
    const app = express();

    app.use(express.json());
    app.use(cookieParser());

    app.use("/auth", authRoutes);
    app.use("/users", userRoutes);
    
    return app;
}