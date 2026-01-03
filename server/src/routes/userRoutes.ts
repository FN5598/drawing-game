import express from "express"
import { getAllUsersController, getUserContoller, deleteUserController } from "../controllers/userControllers";

const router = express.Router();

// router.use(verifyRoles) add middleware for role verification later

router.get("/", getAllUsersController);

router.get("/:id", getUserContoller);

router.delete("/:id", deleteUserController);

export default router;