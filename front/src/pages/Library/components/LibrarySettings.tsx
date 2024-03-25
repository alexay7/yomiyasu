import React, {useState} from "react";
import {useAuth} from "../../../contexts/AuthContext";
import {IconButton, Menu, MenuItem, Tooltip} from "@mui/material";
import {MoreVert} from "@mui/icons-material";
import {api} from "../../../api/api";
import {toast} from "react-toastify";

interface LibrarySettingsProps {
    variant:"manga" | "novela";
}

export function LibrarySettings({variant}:LibrarySettingsProps):React.ReactElement {
    const {userData} = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
    }

    async function rescanLibrary(vari:"manga" | "novela"):Promise<void> {
        toast.info("Reescaneando la biblioteca...");
        try {
            await api.get<{status:string}>(`rescan/${vari}`);
        } catch {
            toast.error("No tienes permisos para realizar esa acción");
        }
        toast.success("Reescaneo terminado");
    }

    return (
        <div className="">
            <Tooltip title="Ajustes de la biblioteca">
                <IconButton className="text-center" onClick={(e)=>{
                    handleClick(e);
                }}
                >
                    <MoreVert className="w-6 h-6"/>
                </IconButton>
            </Tooltip>
            <Menu id="long-menu" keepMounted anchorEl={anchorEl}
                open={Boolean(anchorEl)} onClose={handleClose} disableScrollLock={true}
            >
                {userData?.admin && (
                    <MenuItem key="readlist" onClick={()=>{
                        void rescanLibrary(variant);
                        handleClose();
                    }}
                    >
                        Reescanear biblioteca
                    </MenuItem>
                )}
            </Menu>
        </div>
    );
}