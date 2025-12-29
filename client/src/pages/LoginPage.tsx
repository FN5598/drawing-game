import { NavLink, useNavigate } from "react-router-dom";
import googleLogo from '../assets/google-logo.png';
import { useState } from "react";
import lockOpen from '../assets/lock-open.png';
import lockClose from '../assets/lock-close.png';
import axios from 'axios';
import { toast } from 'react-toastify';

function LoginPage() {
    const navigate = useNavigate();
    const theme = localStorage.getItem("isLightTheme");

    const [locked, setLocked] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    function unlockPassword() {
        setLocked(prev => !prev);
    }

    function saveInput(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        if (name === "password") setPassword(value);
        if (name === "email") setEmail(value);
    }

    async function loginUser(email: string, password: string): Promise<void> {
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`,
                {
                    email,
                    password
                },
                { withCredentials: true }
            );

            if (response.data.success === true) {
                toast.success(`${response.data.message}`, {
                    position: "top-center",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: `${theme}`
                })
                navigate('/');
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                toast.warn(`${err.response?.data.message}`, {
                    position: "top-center",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: `${theme}`
                })
            }
        }
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        loginUser(email, password);
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex justify-center items-center h-screen bg-bg-dark">
            <div className="bg-bg text-text p-5 rounded-2xl w-xs">
                <h1 className="text-4xl text-center pb-5">Login</h1>
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
                <div className="relative">
                    <p className="text-text-muted text-xs pb-1 pl-1">Password</p>
                    <input
                        placeholder="Type your password" className="border p-2 border-border-color rounded-lg w-full"
                        onChange={saveInput}
                        name="password"
                        value={password}
                        type={locked ? "password" : "text"}
                        autoComplete="email"
                    />
                    <img
                        src={locked ? lockClose : lockOpen}
                        className="absolute right-2 top-7 cursor-pointer"
                        onClick={unlockPassword}
                    />
                </div>
                <div className="flex justify-end h-5">
                    <p className="text-xs pt-1 text-text-muted hover:border-b border-dotted cursor-pointer">Forgot password?</p>
                </div>
                <div className="flex justify-center mt-4">
                    <button className="border border-border-muted p-2 rounded-lg pl-10 pr-10 cursor-pointer hover:backdrop-blur-lg hover:bg-white/10 duration-300">Login</button>
                </div>

                <p className="text-text-muted text-xs text-center mt-6">Or Sign Up Using</p>
                <div className="flex justify-center mt-4">
                    <img src={googleLogo} className="cursor-pointer" />
                </div>

                <p className="text-text-muted text-center text-xs pt-8">Or Sign Up Using</p>
                <div className="flex justify-center h-6">
                    <NavLink to="/sign-up" className="text-xs text-text-muted mt-2 hover:border-b border-dotted">SIGN UP</NavLink>
                </div>
            </div>
        </form>
    );
}

export default LoginPage