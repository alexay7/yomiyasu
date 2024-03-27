import {MoreVert} from "@mui/icons-material";
import {Button, IconButton, Menu, MenuItem} from "@mui/material";
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
import {EditProgress} from "./BookProgresses/BookProgresses";
import {toast} from "react-toastify";
import {BookCovers} from "./BookCovers";

interface BookSettingsProps {
    bookData:BookWithProgress;
    insideSerie?:boolean;
    read:boolean;
    setRead:(v:React.SetStateAction<boolean>)=>void;
    deck?:boolean;
    goToBook:(mouse?:boolean, incognito?:boolean)=>void;
}

export function BookSettings(props:BookSettingsProps):React.ReactElement {
    const {bookData, insideSerie, read, setRead, deck, goToBook} = props;
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

    async function markAsReadPages(final:boolean):Promise<void> {
        const body:BookProgress = {
            book:bookData._id,
            status:"completed",
            endDate:new Date(),
            currentPage:final ? bookData.pages : undefined,
            characters:final ? bookData.characters : undefined
        };

        const response = await api.post<BookProgress | undefined, Book>("readprogress", body);
        if (response) {
            forceReload("serie");
        }
    }

    async function markAsRead():Promise<void> {
        let body:BookProgress | undefined = undefined;

        if (bookData.lastProgress?.status === "reading") {
            toast.info(
                <div className="flex flex-col gap-4">
                    <p>¿Hasta que página marcar el volumen como leído?</p>
                    <div className="flex justify-evenly">
                        <Button variant="outlined" onClick={()=>markAsReadPages(false)}>Pág {bookData.lastProgress.currentPage}</Button>
                        <Button variant="outlined" onClick={()=>markAsReadPages(true)}>Pág {bookData.pages}</Button>
                    </div>
                </div>
            );
            return;
        }
        body = {
            book:bookData._id,
            currentPage:bookData.pages,
            status:"completed",
            endDate:new Date(),
            characters:bookData.characters
        };

        const response = await api.post<BookProgress | undefined, Book>("readprogress", body);
        if (response) {
            forceReload("serie");
        }
    }

    async function markAsUnread():Promise<void> {
        const response = await api.post<BookProgress, Book>("readprogress", {
            book:bookData._id,
            currentPage:0,
            status:"unread",
            characters:0
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

    async function pauseSerie():Promise<void> {
        await api.post<unknown, {status:string}>(`serieprogress/pause/${  bookData.serie  }`, {});
        forceReload("all");
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
                <MenuItem onClick={()=>{
                    goToBook(undefined, true);
                }}
                >
                    Leer en incógnito
                </MenuItem>
                {deck && (
                    <MenuItem onClick={()=>{
                        void pauseSerie();
                    }}
                    >
                        Pausar serie
                    </MenuItem>
                )}
                {(bookData.lastProgress || !!read) && (
                    <EditProgress key="editprogress" bookData={bookData} setRead={setRead}/>
                )}
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
                {userData?.admin && bookData.variant === "novela" && (
                    <BookCovers key="covers" bookData={bookData}/>
                )}
                {!insideSerie && (
                    <MenuItem key="serie" onClick={()=>{
                        goTo(navigate, `/app/series/${bookData.serie}`);
                        handleClose();
                    }}
                    onMouseDown={(e)=>{
                        if (e.button === 1) {
                            e.preventDefault();
                            window.open(`/app/series/${bookData.serie}`, "_blank")?.focus();
                        }
                    }}
                    >
                        Ir a la serie
                    </MenuItem>
                )}
                {(!read || (read && bookData.status === "reading")) && (
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
                    <MenuItem onClick={()=>{
                        window.open(`/api/books/${bookData._id}/download`);
                    }}
                    >
                        Descargar Libro
                    </MenuItem>
                </div>
                <BookInfo bookdata={bookData}/>
            </Menu>
        </div>
    );
}