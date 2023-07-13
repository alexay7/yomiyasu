import React, {useContext, useState} from "react";
import {AuthContext} from "../../contexts/AuthContext";
import {useNavigate} from "react-router-dom";

function Login():React.ReactElement {
    const {registerUser} = useContext(AuthContext);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const navigate = useNavigate();

    async function register(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();
        if (!username || !email || !password || !confirmPassword) return;

        if (password !== confirmPassword) return;

        await registerUser(username, email, password);

        return;
    }

    return (
        <div className="">
            <form action="" onSubmit={register}>
                <input type="text" value={username} onChange={(e)=>{
                    setUsername(e.target.value);
                }}
                />
                <input type="text" value={email} onChange={(e)=>{
                    setEmail(e.target.value);
                }}
                />
                <input type="password" value={password} onChange={(e)=>{
                    setPassword(e.target.value);
                }}
                />
                <input type="password" value={confirmPassword} onChange={(e)=>{
                    setConfirmPassword(e.target.value);
                }}
                />
                <button>Enviar</button>
            </form>
            <button onClick={()=>navigate("/")}>hola</button>
        </div>
    );
}

export default Login;