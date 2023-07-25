import React, {useRef, useState} from "react";
import {SerieWithProgress} from "../../types/serie";
import {Fade, IconButton} from "@mui/material";
import {PlayCircle} from "@mui/icons-material";
import {SerieSettings} from "./components/SerieSettings";

interface SerieComponentProps {
    serieData:SerieWithProgress
}

export function SerieComponent(props:SerieComponentProps):React.ReactElement {
    const {serieData} = props;
    const lastProgressRef = useRef<HTMLDivElement>(null);
    const [onItem, setOnItem] = useState(false);

    return (
        <div className="w-[10rem]">
            <div className="h-[13rem] bg-contain bg-repeat-round relative cursor-pointer duration-150 hover:shadow-[inset_0_0_0_4px_var(--primary-color)] hover:opacity-80"
                style={{backgroundImage:`url(/api/static/${serieData.thumbnailPath})`}}
                onClick={(e)=>{
                    if (e.target === e.currentTarget) {
                        window.location.href = `/book/${serieData._id}`;
                    }
                }}
                onMouseEnter={()=>setOnItem(true)} onMouseLeave={()=>setOnItem(false)}
            >
                <div ref={lastProgressRef} className="absolute bottom-0 bg-primary h-1"/>
                {serieData.unreadBooks > 0 && (
                    <div className="absolute top-0 right-0 text-white min-w-[1.5rem] h-6 text-center font-semibold">
                        <p className="bg-primary p-1">{serieData.unreadBooks}</p>
                    </div>
                )}

                <Fade in={onItem}>
                    <div>
                        <IconButton className="absolute w-16 h-16 text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-white rounded-full" onClick={()=>window.location.href = `/book/${serieData._id}`}>
                            <PlayCircle className="w-16 h-16"/>
                        </IconButton>
                    </div>
                </Fade>
            </div>

            <div className="bg-[#1E1E1E] text-white flex flex-col px-2 pt-3 pb-1 rounded-b">
                <a href={`/book/${serieData._id}`} className="line-clamp-2 h-12">{serieData.visibleName}</a>
                <div className="flex items-center justify-between">
                    <p className="text-gray-300 text-sm lg:text-xs">{serieData.bookCount} libros</p>
                    <SerieSettings serieData={serieData}/>
                </div>
            </div>
        </div>
    );
}