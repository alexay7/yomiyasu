import React, {useState} from "react";
import {useAuth} from "../../../contexts/AuthContext";
import {IconButton, Menu, MenuItem} from "@mui/material";
import {MoreVert} from "@mui/icons-material";
import {api} from "../../../api/api";
import {toast} from "react-toastify";

export function LibrarySettings():React.ReactElement {
    const {userData} = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
    }

    async function rescanLibrary():Promise<void> {
        toast.info("Reescaneando la biblioteca...");
        await api.get<{status:string}>("rescan");
        toast.success("Reescaneo terminado");
    }

    return (
        <div className="">
            <IconButton className="text-center" onClick={(e)=>{
                handleClick(e);
            }}
            >
                <MoreVert className="w-6 h-6"/>
            </IconButton>
            <Menu id="long-menu" keepMounted anchorEl={anchorEl}
                open={Boolean(anchorEl)} onClose={handleClose} disableScrollLock={true}
            >
                {userData?.admin && (
                    <MenuItem key="readlist" onClick={()=>{
                        void rescanLibrary();
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