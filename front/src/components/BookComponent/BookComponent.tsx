import React, {useEffect, useRef, useState} from "react";
import {BookWithProgress} from "../../types/book";
import {PlayCircle} from "@mui/icons-material";
import "./styles.css";
import {Fade, IconButton} from "@mui/material";
import {BookSettings} from "./components/BookSettings";
import {useNavigate} from "react-router-dom";

interface BookComponentProps {
    bookData:BookWithProgress,
    insideSerie?:boolean;
}

export function BookComponent(props:BookComponentProps):React.ReactElement {
    const {bookData, insideSerie} = props;
    const lastProgressRef = useRef<HTMLDivElement>(null);
    const [onItem, setOnItem] = useState(false);

    const navigate = useNavigate();

    useEffect(()=>{
        if (lastProgressRef.current && bookData.lastProgress) {
            // Sets the lastProgress bar
            let value = bookData.lastProgress.currentPage * 100 / bookData.pages;
            value = value < 100 ? value : 100;
            value = value > 2 ? value : 2;
            lastProgressRef.current.style.width = `${value}%`;
        }
    }, [bookData]);

    return (
        <div className="w-[10rem]">
            <div className="h-[13rem] rounded-t-sm bg-contain bg-repeat-round relative cursor-pointer duration-150 hover:shadow-[inset_0_0_0_4px_var(--primary-color)] hover:opacity-80"
                style={{backgroundImage:`url(/api/static/${bookData.seriePath}/${bookData.imagesFolder}/${bookData.thumbnailPath})`}}
                onClick={(e)=>{
                    if (e.target === e.currentTarget) {
                        navigate(`/reader/${bookData._id}`);
                    }
                }}
                onMouseEnter={()=>setOnItem(true)} onMouseLeave={()=>setOnItem(false)}
            >
                <div ref={lastProgressRef} className="absolute bottom-0 bg-primary h-1"/>
                {bookData.status === "unread" && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-solid" style={{borderWidth:"0 35px 35px 0", borderColor:"transparent var(--primary-color) transparent transparent"}}/>
                )}

                <Fade in={onItem}>
                    <div>
                        <IconButton className="absolute w-16 h-16 text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-white rounded-full" onClick={()=>navigate(`/reader/${bookData._id}`)}>
                            <PlayCircle className="w-16 h-16"/>
                        </IconButton>
                    </div>
                </Fade>
            </div>

            <div className="bg-[#1E1E1E] text-white flex flex-col px-2 pt-3 pb-1 rounded-b">
                <a href={`/reader/${bookData._id}`} className="line-clamp-2 h-12">{bookData.visibleName}</a>
                <div className="flex items-center justify-between">
                    <p className="text-gray-300 text-sm lg:text-xs">{bookData.pages} páginas</p>
                    <BookSettings bookData={bookData} insideSerie={insideSerie}/>
                </div>
            </div>
        </div>
    );
}