import {MoreVert} from "@mui/icons-material";
import {IconButton, Menu, MenuItem} from "@mui/material";
import React, {useState} from "react";
import {useAuth} from "../../../contexts/AuthContext";
import {Book, BookProgress, BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {useGlobal} from "../../../contexts/GlobalContext";

interface BookSettingsProps {
    bookData:BookWithProgress;
}

export function BookSettings(props:BookSettingsProps):React.ReactElement {
    const {bookData} = props;
    const {userData} = useAuth();
    const {forceReload} = useGlobal();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
    }

    async function markAsRead():Promise<void> {
        const response = await api.post<BookProgress, Book>("readprogress", {
            book:bookData._id,
            currentPage:bookData.pages,
            status:"completed",
            endDate:new Date()
        }
        );

        if (response) {
            forceReload();
        }
    }

    async function markAsUnread():Promise<void> {
        const response = await api.post<BookProgress, Book>("readprogress", {
            book:bookData._id,
            currentPage:0,
            status:"unread"
        }
        );

        if (response) {
            forceReload();
        }
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
                <MenuItem key="serie" onClick={handleClose}>
                    Ir a la serie
                </MenuItem>
                {userData?.admin && (
                    <MenuItem key="edit" onClick={handleClose}>
                        Editar
                    </MenuItem>
                )}
                {userData?.admin && (
                    <MenuItem key="metadata" onClick={handleClose}>
                        Actualizar metadatos
                    </MenuItem>
                )}
                {bookData.status !== "completed" && (
                    <MenuItem key="read" onClick={async()=>{
                        await markAsRead();
                        handleClose();
                    }}
                    >
                        Marcar como leído
                    </MenuItem>
                )}
                {bookData.status !== "unread" && (
                    <MenuItem key="unread" onClick={async()=>{
                        await markAsUnread();
                        handleClose();
                    }}
                    >
                        Marcar como no leído
                    </MenuItem>
                )}
            </Menu>
        </div>
    );
}