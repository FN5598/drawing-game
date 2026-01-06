import { NavLink } from "react-router-dom";

export function HeaderComponent() {

    return (
        <nav className="flex flex-row justify-between pl-20 pr-20 bg-bg-dark text-white font-bangers font-bold p-4 items-center">
            <p>Task Manager</p>
            <div className="flex gap-20">
                <NavLink to='/'>Home Page</NavLink>
                <NavLink to='/login'>Login</NavLink>
            </div>
        </nav>
    );
}