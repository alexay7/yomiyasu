import React, {useEffect, useRef} from "react";
import {BookWithProgress} from "../../types/book";

interface BookComponentProps {
    bookData:BookWithProgress
}

export function BookComponent(props:BookComponentProps):React.ReactElement {
    const {bookData} = props;
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(()=>{
        if (progressRef.current && bookData.progress && bookData.progress.length > 0) {
            // Sets the progress bar
            progressRef.current.style.width = `${bookData.progress[0].currentPage * 100 / bookData.pages}%`;
        }
    }, [bookData]);

    return (
        <div className="w-40">
            <div className="h-[13rem] bg-contain bg-repeat-round relative cursor-pointer duration-150 hover:shadow-[inset_0_0_0_4px_var(--primary-color)] hover:opacity-80"
                style={{backgroundImage:`url(/api/static/${bookData.serie}/${bookData.imagesFolder}/${bookData.thumbnailPath})`}}
                onClick={()=>window.location.href = "/pagina-leer-libro"}
            >
                <div ref={progressRef} className="absolute bottom-0 bg-primary h-1"/>
            </div>
            <div className="bg-[#1E1E1E] text-white flex flex-col px-2 pt-3 pb-4 rounded-b gap-2">
                <a href="/página-leer-libro" className="line-clamp-2 h-12">{bookData.visibleName}</a>
                <p className="text-gray-300 text-xs">{bookData.pages} páginas</p>
            </div>
        </div>
    );
}