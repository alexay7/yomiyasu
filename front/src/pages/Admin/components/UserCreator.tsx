import React, {Fragment, useState} from "react";
import {IconButton, TextField} from "@mui/material";
import {toast} from "react-toastify";
import {Add} from "@mui/icons-material";
import {useAuth} from "../../../contexts/AuthContext";
import {PopupWindow} from "../../../components/PopupWindow/PopupWindow";

interface UserCreatorProps {
    refetch: ()=>void
}

export function UserCreator(props:UserCreatorProps):React.ReactElement {
    const {refetch} = props;
    const {registerUser} = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [open, setOpen] = useState(false);

    function closePopup():void {
        setOpen(false);
    }

    async function saveChanges(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();
        if (username === "" || password === "") {
            toast.error("Rellena todos los campos obligatorios");
            return;
        }

        try {
            const response = await registerUser(username, email, password);
            if (response) {
                toast.success("Usuario registrado con éxito");
                setOpen(false);
                refetch();
            }
        } catch {
            toast.error("No tienes permisos para realizar esa acción");
        }
    }

    return (
        <Fragment>
            <IconButton className="p-3 bg-primary" onClick={()=>setOpen(true)}>
                <Add/>
            </IconButton>
            {open && (
                <PopupWindow open={open} title={"Registrar nuevo usuario"} closePopup={closePopup} onSubmit={saveChanges}>
                    <div className="flex flex-col gap-4">
                        <TextField required onChange={(e)=>setUsername(e.target.value)}
                            value={username} fullWidth variant="filled" label="Nombre de usuario"
                        />
                        <TextField required type="email" onChange={(e)=>setEmail(e.target.value)}
                            value={email} fullWidth variant="filled" label="Correo electrónico"
                        />
                        <TextField required type="password" onChange={(e)=>setPassword(e.target.value)}
                            value={password} fullWidth variant="filled" label="Contraseña"
                        />
                    </div>
                </PopupWindow>
            )}
        </Fragment>
    );
}