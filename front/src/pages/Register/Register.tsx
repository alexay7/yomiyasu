import React, {useState, useEffect} from "react";
import TextField from "@mui/material/TextField";
import {Button, Divider} from "@mui/material";
import {useAuth} from "../../contexts/AuthContext";
import {useNavigate} from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import {goTo} from "../../helpers/helpers";
import {Helmet} from "react-helmet";
import {api} from "../../api/api";
import {toast} from "react-toastify";
import {HttpError} from "../../types/error";

function Register():React.ReactElement {
    const {loading, loggedIn} = useAuth();
    const [user, setUser] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [invitation, setInvitation] = useState("");
    const navigate = useNavigate();

    useEffect(()=>{
        if (loggedIn) {
            goTo(navigate, "/");
        }
    }, [loading, loggedIn, navigate]);

    async function handleSubmit(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();

        if (!user || !email || !password || !invitation) return;

        try {
            const res = await api.post<{username:string, email:string, password:string, code:string}, {statusCode?:number}>("invis/redeem", {username:user, email, password, code:invitation});

            if (!res) return;

            if (res.statusCode === 401) {
                return;
            } else if (res.statusCode === 429) {
                return;
            }

            toast.success("¡Usuario creado con éxito! Inicia sesión para continuar.");
            goTo(navigate, "/login");
        } catch (err) {
            const error = err as HttpError;

            switch (error.status) {
                case 401:{
                    toast.error("¡Código de invitación inválido!");
                    break;
                }
                case 429:{
                    toast.error("Vuelve a intentarlo dentro de un minuto");
                    break;
                }
            }
        }
    }

    return (
        <div className="h-[100svh] flex justify-center items-center bg-cover bg-gradient-radial from-gray-500 to-[#000011]">
            <Helmet>
                <title>YomiYasu - Registro</title>
            </Helmet>
            <div className="dark:bg-[#2D2D2D] bg-white w-11/12 md:w-2/3 lg:w-1/2 xl:w-1/3 rounded-xl dark:text-white flex flex-col items-center py-8">
                <h1>Bienvenido a Yomiyasu</h1>
                <Divider className="w-3/4 pt-2"/>
                <div className="border-4 border-primary border-solid rounded-full p-2 my-4">
                    <PersonIcon sx={{fontSize:"120px"}} className="text-primary"/>
                </div>
                <form className="flex flex-col gap-4 w-1/2" onSubmit={handleSubmit}>
                    <TextField required type="text" className="w-full shadow-md" id="username"
                        label="Nombre de Usuario" variant="standard"
                        value={user} onChange={(e)=>setUser(e.target.value)}
                    />
                    <TextField required type="email" className="w-full shadow-md" id="email"
                        label="Correo Electrónico" variant="standard"
                        value={email} onChange={(e)=>setEmail(e.target.value)}
                    />
                    <TextField required autoComplete="currentPassword" type="password"
                        className="w-full shadow-md" id="password" label="Contraseña" variant="standard"
                        value={password} onChange={(e)=>setPassword(e.target.value)}
                    />
                    <TextField required type="text" className="w-full shadow-md" id="invitation"
                        label="Código de Invitación" variant="standard"
                        value={invitation} onChange={(e)=>setInvitation(e.target.value)}
                    />
                    <Button type="submit" className="bg-primary text-white">Crear cuenta</Button>
                </form>
            </div>
        </div>
    );
}

export default Register;