import {MoreVert} from "@mui/icons-material";
import {IconButton, Menu, MenuItem} from "@mui/material";
import React, {useState} from "react";
import {useAuth} from "../../../contexts/AuthContext";
import {Book, BookProgress, BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {useGlobal} from "../../../contexts/GlobalContext";
import {useNavigate} from "react-router-dom";
import {goTo} from "../../../helpers/helpers";
import {addToReadlist, removeFromReadlist} from "../../../helpers/series";
import {EditBook} from "../../EditBook/EditBook";
import {BookInfo} from "../../BookInfo/BookInfo";

interface BookSettingsProps {
    bookData:BookWithProgress;
    insideSerie?:boolean;
    read:boolean;
    setRead:(v:React.SetStateAction<boolean>)=>void
}

export function BookSettings(props:BookSettingsProps):React.ReactElement {
    const {bookData, insideSerie, read, setRead} = props;
    const {userData} = useAuth();
    const {forceReload} = useGlobal();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const navigate = useNavigate();

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
            forceReload("serie");
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
            forceReload("serie");
        }
    }

    async function recaculateChars(borders?:boolean):Promise<void> {
        let link = `books/${bookData._id}/chars`;

        if (borders) {
            link += "?borders=true";
        }

        const response = await api.patch<unknown, {status:string}>(link, {});

        if (response) {
            forceReload("all");
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
                {userData?.admin && (
                    [
                        <EditBook key="edit" bookData={bookData}/>,
                        <MenuItem key="chars" onClick={()=>{
                            void recaculateChars();
                        }}
                        >Recalcular caracteres
                        </MenuItem>,
                        <MenuItem key="charsborder" onClick={()=>{
                            void recaculateChars(true);
                        }}
                        >Recalcular caracteres (con bordes)
                        </MenuItem>
                    ]
                )}
                {!insideSerie && (
                    <MenuItem key="serie" onClick={()=>{
                        goTo(navigate, `/app/series/${bookData.serie}`);
                        handleClose();
                    }}
                    >
                        Ir a la serie
                    </MenuItem>
                )}
                {!read && (
                    <MenuItem key="read" onClick={async()=>{
                        await markAsRead();
                        setRead(true);
                        handleClose();
                    }}
                    >
                        Marcar como leído
                    </MenuItem>
                )}
                {bookData.status && read && (
                    <MenuItem key="unread" onClick={async()=>{
                        await markAsUnread();
                        setRead(false);
                        handleClose();
                    }}
                    >
                        {bookData.status === "reading" ? "Eliminar progreso actual" : "Marcar como no leído"}
                    </MenuItem>
                )}
                <div>
                    {bookData.readlist ? (
                        <MenuItem key="readlist" onClick={()=>{
                            void removeFromReadlist(bookData.serie);
                            forceReload("readlist");
                            handleClose();
                        }}
                        >
                            Quitar serie de &quot;Leer más tarde&quot;
                        </MenuItem>
                    ) : (
                        <MenuItem key="readlist" onClick={()=>{
                            void addToReadlist(bookData.serie);
                            forceReload("readlist");
                            handleClose();
                        }}
                        >
                            Añadir serie a &quot;Leer más tarde&quot;
                        </MenuItem>
                    )}
                </div>
                <BookInfo bookdata={bookData}/>
            </Menu>
        </div>
    );
}