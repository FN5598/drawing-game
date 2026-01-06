import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import lockOpen from '../assets/lock-open.png';
import lockClose from '../assets/lock-close.png';
import axios from 'axios';
import { toast } from 'react-toastify';

function SignupPage() {
    const navigate = useNavigate();
    const theme = localStorage.getItem("isLightTheme");

    const [locked, setLocked] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [verifiedPassword, setVerifiedPassword] = useState("");

    function unlockPassword() {
        setLocked(prev => !prev);
    }

    function saveInput(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        if (name === "password") setPassword(value);
        if (name === "email") setEmail(value);
        if (name === "verified-password") setVerifiedPassword(value);
    }

    async function createUser(email: string, password: string): Promise<void> {
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/sign-up`,
                {
                    email,
                    password
                },
                { withCredentials: true }
            )

            if (response.data.success === true) {
                toast.success(`${response.data.message}`, {
                    position: "top-center",
                    autoClose: 500,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: `${theme}`
                })
                navigate('/login');
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                toast.warning(`${err.response?.data.message}`, {
                    position: "top-center",
                    autoClose: 500,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: `${theme}`
                });
            } else {
                console.error("Unexpected error");
            }
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (verifiedPassword !== password) {
            toast.warning("Password fields must match!", {
                position: "top-center",
                autoClose: 500,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: `${theme}`
            });
            return;
        }

        createUser(email, password);
    }

    return (
        <form
            className="flex justify-center items-center h-screen bg-bg-dark"
            onSubmit={handleSubmit}
        >
            <div className="bg-bg-light text-text p-5 rounded-2xl w-xs">
                <h1 className="text-4xl text-center pb-5">Sign Up</h1>
                <div className="mb-2">
                    <p className="text-text-muted text-xs pb-1 pl-1">Email</p>
                    <input
                        placeholder="Type your email" className="border p-2 border-border-color rounded-lg w-full"
                        onChange={saveInput}
                        name="email"
                        value={email}
                        type="email"
                        autoComplete="email"
                    />
                </div>
                <div className="mb-2">
                    <p className="text-text-muted text-xs pb-1 pl-1">Password</p>
                    <input
                        placeholder="Type your password" className="border p-2 border-border-color rounded-lg w-full"
                        onChange={saveInput}
                        name="password"
                        value={password}
                        type={"password"}
                        autoComplete="new-password"
                    />
                </div>
                <div className="relative">
                    <p className="text-text-muted text-xs pb-1 pl-1">Password</p>
                    <input
                        placeholder="Type your password" className="border p-2 border-border-color rounded-lg w-full"
                        onChange={saveInput}
                        name="verified-password"
                        value={verifiedPassword}
                        type={locked ? "password" : "text"}
                        autoComplete="new-password"
                    />
                    <img
                        src={locked ? lockClose : lockOpen}
                        className="absolute right-2 top-7 cursor-pointer"
                        onClick={unlockPassword}
                    />
                </div>
                <div className="flex justify-center mt-16">
                    <button
                        className="border border-border-muted p-2 rounded-lg pl-10 pr-10 cursor-pointer hover:backdrop-blur-lg hover:bg-white/10 duration-300"
                    >Sign Up</button>
                </div>

                <p className="text-text-muted text-center text-xs pt-8">Already have an account?</p>
                <div className="flex justify-center h-6">
                    <NavLink to="/login" className="text-xs text-text-muted mt-2 hover:border-b border-dotted">LOGIN</NavLink>
                </div>
            </div>
        </form>
    );
}

export default SignupPage