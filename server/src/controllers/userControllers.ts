import * as userService from "../services/userService";
import { Request, Response } from "express";

//@desc Get all existing users
//@route GET users/
//@access Private
const getAllUsersController = async (req: Request, res: Response) => {
    try {
        const users = await userService.getAllUsers();

        if (!users || users.length === 0) {
            return res.status(404).json({
                message: "No users found",
                success: false
            });
        };

        return res.status(200).json({
            message: "Successfully fetched users",
            success: true,
            users: users
        })
    } catch (err) {
        res.status(500).json({
            message: "Server error",
            success: false
        })
    }
}

//@desc Get One user by ID
//@route GET users/:id
//@access Private
const getUserContoller = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            message: "ID is required",
            success: false
        })
    }

    try {
        const user = await userService.getUserById(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        return res.status(200).json({
            message: "Successfully fetched user",
            success: true,
            user: user
        });
    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            success: false
        });
    }
}

//@desc Delete User 
//@route DELETE users/:id
//@access Private
const deleteUserController = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            message: "User ID is required",
            success: false
        })
    }

    try {
        await userService.deleteUser(id);

        return res.status(200).json({
            message: "Successfully deleted user",
            success: true,
        })
    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            success: false
        });
    }
}

export {
    getAllUsersController,
    getUserContoller,
    deleteUserController
}