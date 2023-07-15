import React, {Fragment, useEffect, useRef, useState} from "react";
import {BookWithProgress} from "../../types/book";
import {MoreVert, PlayCircle, WatchLater} from "@mui/icons-material";
import {CSSTransition} from "react-transition-group";
import "./styles.css";
import {IconButton} from "@mui/material";

interface BookComponentProps {
    bookData:BookWithProgress
}

export function BookComponent(props:BookComponentProps):React.ReactElement {
    const {bookData} = props;
    const progressRef = useRef<HTMLDivElement>(null);
    const [onItem, setOnItem] = useState(false);

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
                onClick={()=>window.location.href = "/pagina-leer-libro"}
                onMouseEnter={()=>setOnItem(true)} onMouseLeave={()=>setOnItem(false)}
            >
                <div ref={progressRef} className="absolute bottom-0 bg-primary h-1"/>
                {bookData.status === "COMPLETED" && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-solid" style={{borderWidth:"0 35px 35px 0", borderColor:"transparent var(--primary-color) transparent transparent"}}/>
                )}

                {bookData.status === "READLIST" && (
                    <Fragment>
                        <div className="absolute top-0 right-0 w-0 h-0 border-solid border-y-transparent border-l-transparent border-r-blue-500" style={{borderWidth:"0 35px 35px 0"}}>
                        </div>
                        <WatchLater className="absolute top-[2px] right-[2px]" sx={{width:15, height:15}}/>
                    </Fragment>
                )}

                <CSSTransition classNames="tools" timeout={150} in={onItem} unmountOnExit>
                    <div>
                        <PlayCircle className="absolute w-16 h-16 text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-white rounded-full"/>
                        <IconButton className="absolute text-center right-2 bottom-2" onClick={(e)=>{
                            // Esto sirve para que no redirija al hacer click en la tarjeta
                            e.stopPropagation();
                            console.log("hola");
                        }}
                        >
                            <MoreVert className="w-6 h-6"/>
                        </IconButton>
                    </div>
                </CSSTransition>
            </div>
            <div className="bg-[#1E1E1E] text-white flex flex-col px-2 pt-3 pb-4 rounded-b gap-2">
                <a href="/página-leer-libro" className="line-clamp-2 h-12">{bookData.visibleName}</a>
                <p className="text-gray-300 text-xs">{bookData.pages} páginas</p>
            </div>
        </div>
    );
}