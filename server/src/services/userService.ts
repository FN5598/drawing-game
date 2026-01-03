import User, { IUser } from "../models/userSchema";

export async function getAllUsers(): Promise<IUser[]> {
    const users = await User.find();
    return users;
}

export async function getUserById(id: string): Promise<IUser | null> {
    const user = await User.findById(id);
    return user;
}

export async function getUserByEmail(email: string): Promise<IUser | null> {
    const user = await User.findOne({ email });
    return user;
}

export async function deleteUser(id: string): Promise<boolean> {
    const user = await User.findByIdAndDelete(id);
    return !!user;
}

export async function createUser(email: string, hashedPassword: string): Promise<IUser> {
    const user = await User.create({
        email,
        hashedPassword
    });
    return user;
}