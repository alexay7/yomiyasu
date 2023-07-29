import React, {useRef, useState} from "react";
import {SerieWithProgress} from "../../types/serie";
import {Fade, IconButton} from "@mui/material";
import {Book} from "@mui/icons-material";
import {SerieSettings} from "./components/SerieSettings";
import {useNavigate} from "react-router-dom";
import {goTo} from "../../helpers/helpers";

interface SerieComponentProps {
    serieData:SerieWithProgress
}

export function SerieComponent(props:SerieComponentProps):React.ReactElement {
    const {serieData} = props;
    const lastProgressRef = useRef<HTMLDivElement>(null);
    const [onItem, setOnItem] = useState(false);

    const navigate = useNavigate();

    const thumbnail = `/api/static/${serieData.thumbnailPath}`;

    return (
        <div className="w-[9rem] flex-shrink-0">
            <div className="h-[13rem] bg-contain bg-repeat-round relative cursor-pointer duration-150 hover:shadow-[inset_0_0_0_4px_var(--primary-color)] hover:opacity-80"
                style={{backgroundImage:`url(${encodeURI(thumbnail)})`}}
                onClick={(e)=>{
                    if (e.target === e.currentTarget) {
                        goTo(navigate, `/app/series/${serieData._id}`);
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
                {serieData.difficulty > 0 && (
                    <div className="absolute top-0 left-0 text-white min-w-[1.5rem] h-6 text-center font-semibold">
                        <p className="border-2 border-primary border-solid rounded-md m-1 px-3 text-sm bg-white text-primary">{Math.round(serieData.difficulty)}</p>
                    </div>
                )}

                <Fade in={onItem}>
                    <div>
                        <IconButton className="absolute w-16 h-16 text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-white rounded-full" onClick={()=>goTo(navigate, `/app/series/${serieData._id}`)}>
                            <Book className="w-12 h-12"/>
                        </IconButton>
                    </div>
                </Fade>
            </div>

            <div className="bg-[#1E1E1E] text-white flex flex-col px-2 pt-3 pb-1 rounded-b">
                <a href={`/app/series/${serieData._id}`} className="line-clamp-2 h-12">{serieData.visibleName}</a>
                <div className="flex items-center justify-between">
                    <p className="text-gray-300 text-sm lg:text-xs">{serieData.bookCount} libros</p>
                    <SerieSettings serieData={serieData}/>
                </div>
            </div>
        </div>
    );
}