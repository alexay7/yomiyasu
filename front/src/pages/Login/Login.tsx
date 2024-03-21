import React, {useState, useEffect} from "react";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import {Button, Divider} from "@mui/material";
import {useAuth} from "../../contexts/AuthContext";
import {useNavigate} from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import {goTo} from "../../helpers/helpers";
import {Helmet} from "react-helmet";

function Login():React.ReactElement {
    const {loginUser, loading, loggedIn} = useAuth();
    const [emailUser, setEmailUser] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();

    useEffect(()=>{
        if (loggedIn) {
            goTo(navigate, "/");
        }
    }, [loading, loggedIn, navigate]);

    async function handleSubmit(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();

        if (!emailUser || !password) return;

        const response = await loginUser(emailUser, password);
        if (response && response.status === "ok") {
            goTo(navigate, "/");
        }
    }

    return (
        <div className="h-[100svh] flex justify-center items-center bg-cover bg-gradient-radial from-gray-500 to-[#000011]">
            <Helmet>
                <title>YomiYasu - Login</title>
            </Helmet>
            <div className="dark:bg-[#2D2D2D] bg-white w-11/12 md:w-2/3 lg:w-1/2 xl:w-1/3 rounded-xl dark:text-white flex flex-col items-center py-8">
                <h1>Inicio de Sesión</h1>
                <Divider className="w-3/4 pt-2"/>
                <div className="border-4 border-primary border-solid rounded-full p-2 my-4">
                    <PersonIcon sx={{fontSize:"120px"}} className="text-primary"/>
                </div>
                <form className="flex flex-col gap-4 w-1/2" onSubmit={handleSubmit}>
                    <TextField required type="text" className="w-full shadow-md" id="usernameemail"
                        label="Nombre de Usuario/Email" variant="standard"
                        value={emailUser} onChange={(e)=>setEmailUser(e.target.value)}
                    />
                    <TextField required autoComplete="currentPassword" type="password"
                        className="w-full shadow-md" id="password" label="Contraseña" variant="standard"
                        value={password} onChange={(e)=>setPassword(e.target.value)}
                    />
                    <FormControlLabel className="select-none flex items-center" control={(
                        <Checkbox checked={rememberMe} onChange={(e)=>{
                            setRememberMe(e.target.checked);
                        }}
                        />)} label="Recuérdame"
                    />
                    <Button type="submit" className="bg-primary text-white">Iniciar Sesión</Button>
                </form>
            </div>
        </div>
    );
}

export default Login;