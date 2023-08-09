import React, {Fragment, useEffect, useRef, useState} from "react";
import {BookComponent} from "../BookComponent/BookComponent";
import {BookWithProgress} from "../../types/book";
import {IconButton} from "@mui/material";
import {ArrowLeft, ArrowRight} from "@mui/icons-material";
import {SerieWithProgress} from "../../types/serie";
import {SerieComponent} from "../SerieComponent/SerieComponent";

interface ComponentScrollerProps {
    title:string;
    components:BookWithProgress[] | SerieWithProgress[];
    type:"books" | "series"
}

export function ComponentScroller(props:ComponentScrollerProps):React.ReactElement {
    const {title, components, type} = props;
    const ulRef = useRef<HTMLUListElement>(null);
    const [left, setLeft] = useState(0);
    const [maxRight, setMaxRight] = useState(!ulRef);

    useEffect(()=>{
        function setRight():void {
            if (!ulRef.current) return;
            setMaxRight(ulRef.current.scrollWidth - ulRef.current.scrollLeft === ulRef.current.clientWidth);
        }

        setRight();
        window.addEventListener("resize", setRight);

        return ()=>{
            window.removeEventListener("resize", setRight);
        };
    }, [ulRef, components]);

    function scrollRight():void {
        if (!ulRef || !ulRef.current) return;

        ulRef.current.scrollBy({left:document.body.clientWidth, behavior:"smooth"});

        setTimeout(()=>{
            if (!ulRef.current) return;
            setMaxRight(ulRef.current.scrollWidth - ulRef.current.scrollLeft === ulRef.current.clientWidth);
            setLeft(ulRef.current?.scrollLeft || 0);
        }, 300);
    }

    function scrollLeft():void {
        if (!ulRef || !ulRef.current) return;

        ulRef.current.scrollBy({left:-document.body.clientWidth, behavior:"smooth"});

        setTimeout(()=>{
            if (!ulRef.current) return;
            setMaxRight(ulRef.current.scrollWidth - ulRef.current.scrollLeft === ulRef.current.clientWidth);
            setLeft(ulRef.current?.scrollLeft || 0);
        }, 300);
    }

    return (
        <Fragment>
            <div className="flex items-center justify-between">
                <h2>{title}</h2>
                <div className="flex items-center">
                    <IconButton onClick={scrollLeft} disabled={left === 0}>
                        <ArrowLeft/>
                    </IconButton>
                    <IconButton onClick={scrollRight} disabled={maxRight}>
                        <ArrowRight/>
                    </IconButton>
                </div>
            </div>
            {type === "books" ? (
                <ul ref={ulRef} className="lg:px-4 flex gap-8 flex-nowrap overflow-x-auto no-scrollbar py-4">
                    {components?.map((book)=>(
                        <BookComponent key={book._id} bookData={book as BookWithProgress}/>
                    ))}
                </ul>
            ) : (
                <ul ref={ulRef} className="lg:px-4 flex gap-8 flex-nowrap overflow-x-auto no-scrollbar py-4">
                    {components?.map((serie)=>(
                        <SerieComponent key={serie._id} serieData={serie as SerieWithProgress}/>
                    ))}
                </ul>
            )}
        </Fragment>
    );
}