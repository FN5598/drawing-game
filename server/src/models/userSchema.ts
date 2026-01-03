import { Schema, model, Document } from "mongoose";


export interface IUser extends Document {
    email: string;
    hashedPassword: string;
    createdAt?: Date;
    updatedAt?: Date;
    refreshToken?: string | undefined
}


const userSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true
    },
    hashedPassword: {
        type: String,
        required: true,
        select: false
    },
    refreshToken: {
        type: String
    }
}, {
    timestamps: true
})

const User = model<IUser>("User", userSchema);
export default User;