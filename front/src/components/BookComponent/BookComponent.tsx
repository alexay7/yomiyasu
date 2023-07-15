import React, {Fragment, useEffect, useRef, useState} from "react";
import {BookWithProgress} from "../../types/book";
import {MoreVert, PlayCircle, WatchLater} from "@mui/icons-material";
import "./styles.css";
import {Fade, IconButton, Menu, MenuItem} from "@mui/material";
import {useAuth} from "../../contexts/AuthContext";

interface BookComponentProps {
    bookData:BookWithProgress
}

export function BookComponent(props:BookComponentProps):React.ReactElement {
    const {userData} = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const {bookData} = props;
    const progressRef = useRef<HTMLDivElement>(null);
    const [onItem, setOnItem] = useState(false);

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
    }

    useEffect(()=>{
        if (progressRef.current && bookData.progress && bookData.progress.length > 0) {
            // Sets the progress bar
            let value = bookData.progress[0].currentPage * 100 / bookData.pages;
            value = value < 100 ? value : 100;
            progressRef.current.style.width = `${value}%`;
        }
    }, [bookData]);

    return (
        <div className="min-w-[10rem]">
            <div className="h-[13rem] bg-contain bg-repeat-round relative cursor-pointer duration-150 hover:shadow-[inset_0_0_0_4px_var(--primary-color)] hover:opacity-80"
                style={{backgroundImage:`url(/api/static/${bookData.serie}/${bookData.imagesFolder}/${bookData.thumbnailPath})`}}
                onClick={(e)=>{
                    if (e.target === e.currentTarget) {
                        window.location.href = "/pagina-leer-libro";
                    }
                }}
                onMouseEnter={()=>setOnItem(true)} onMouseLeave={()=>setOnItem(false)}
            >
                <div ref={progressRef} className="absolute bottom-0 bg-primary h-1"/>
                {bookData.status === "NOT_READING" && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-solid" style={{borderWidth:"0 35px 35px 0", borderColor:"transparent var(--primary-color) transparent transparent"}}/>
                )}

                {bookData.status === "READLIST" && (
                    <Fragment>
                        <div className="absolute top-0 right-0 w-0 h-0 border-solid border-y-transparent border-l-transparent border-r-blue-500" style={{borderWidth:"0 35px 35px 0"}}>
                        </div>
                        <WatchLater className="absolute top-[2px] right-[2px]" sx={{width:15, height:15}}/>
                    </Fragment>
                )}

                <Fade in={onItem}>
                    <div>
                        <PlayCircle className="absolute w-16 h-16 text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-white rounded-full"/>
                        <>
                            <IconButton className="absolute text-center right-2 bottom-2" onClick={(e)=>{
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
                                {(bookData.status !== "READLIST" && (!bookData.progress || bookData.progress.length === 0)) && (
                                    <MenuItem key="read" onClick={handleClose}>
                                        Añadir a &quot;Leer más tarde&quot;
                                    </MenuItem>
                                )}
                                {(!bookData.progress || bookData.progress.length === 0) && (
                                    <MenuItem key="read" onClick={handleClose}>
                                        Marcar como leído
                                    </MenuItem>
                                )}
                                {bookData.progress && bookData.progress.length > 0 && (
                                    <MenuItem key="unread" onClick={handleClose}>
                                        Marcar como no leído
                                    </MenuItem>
                                )}
                            </Menu>
                        </>
                    </div>
                </Fade>
            </div>

            <div className="bg-[#1E1E1E] text-white flex flex-col px-2 pt-3 pb-4 rounded-b gap-2">
                <a href="/página-leer-libro" className="line-clamp-2 h-12">{bookData.visibleName}</a>
                <p className="text-gray-300 text-xs">{bookData.pages} páginas</p>
            </div>
        </div>
    );
}