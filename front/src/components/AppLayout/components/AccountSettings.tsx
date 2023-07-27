import React, {Fragment, useEffect, useState} from "react";
import {PopupWindow} from "../../PopupWindow/PopupWindow";
import {LateralListItem} from "./LateralListItem";
import {AccountCircle} from "@mui/icons-material";
import {useAuth} from "../../../contexts/AuthContext";
import {Divider, TextField} from "@mui/material";
import {UpdateProfile} from "../../../types/user";
import {toast} from "react-toastify";
import {api} from "../../../api/api";

export function AccountSettings():React.ReactElement {
    const [open, setOpen] = useState(false);
    const {userData, logoutUser} = useAuth();
    const [username, setUsername] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(()=>{
        if (!userData) return;

        setUsername(userData.username);
    }, [userData]);

    function closePopup():void {
        setOpen(false);
    }

    async function editUserData(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();

        const body:UpdateProfile = {};
        let changes = false;

        if (username !== userData?.username) {
            // cambio de nombre de usuario
            changes = true;
            body.newUsername = username;
        }

        if (oldPassword && newPassword && confirmPassword) {
            if (newPassword !== confirmPassword) {
                toast.error("Las contraseñas no coinciden");
                return;
            }
            changes = true;
            body.oldPassword = oldPassword;
            body.newPassword = newPassword;
        }

        if (changes) {
            try {
                await api.patch<UpdateProfile, {status:string}>("users/update", body);
                toast.success("Perfil actualizado con éxito");
                if (body.oldPassword && body.newPassword) {
                    await logoutUser();
                }
                setOpen(false);
            } catch {
                toast.error("La contraseña no es correcta");
                return;
            }
        }
    }

    return (
        <Fragment>
            <LateralListItem text="Ajustes de Cuenta" Icon={AccountCircle} onClick={()=>setOpen(true)}/>
            <PopupWindow title="Ajustes de cuenta" open={open} closePopup={closePopup} onSubmit={editUserData}>
                <div className="flex flex-col gap-4">
                    <p>Ajustes del perfil</p>
                    <TextField type="text" required onChange={(e)=>setUsername(e.target.value)} value={username} fullWidth variant="filled" label="Nombre de usuario"/>
                    <TextField type="email" disabled value={userData?.email} fullWidth variant="filled" label="Correo electrónico"/>
                    <Divider/>
                    <p>Cambiar contraseña</p>
                    <TextField type="password" variant="filled" fullWidth value={oldPassword} onChange={(e)=>setOldPassword(e.target.value)} label="Contraseña actual"/>
                    <TextField type="password" variant="filled" fullWidth value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} label="Nueva contraseña"/>
                    <TextField type="password" variant="filled" fullWidth value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} label="Repetir nueva contraseña"/>
                </div>
            </PopupWindow>
        </Fragment>
    );
}