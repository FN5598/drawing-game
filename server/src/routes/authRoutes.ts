import express from "express"
import { loginUserController, createUserController, deleteUserController, refreshAccessTokenController, logoutUserController } from "../controllers/authControllers";
import verifyToken from "../middlewares/verifyToken";

const router = express.Router();

router.post("/login", loginUserController);

router.post("/sign-up", createUserController);

router.delete("/delete", verifyToken, deleteUserController);

router.post("/refresh", refreshAccessTokenController);

router.post("/logout", verifyToken, logoutUserController);

export default router;