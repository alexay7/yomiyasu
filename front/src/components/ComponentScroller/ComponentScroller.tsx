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
    type:"books" | "series";
    deck?:boolean;
}

export function ComponentScroller(props:ComponentScrollerProps):React.ReactElement {
    const {title, components, type, deck} = props;
    const ulRef = useRef<HTMLUListElement>(null);
    const [left, setLeft] = useState(0);
    const [maxRight, setMaxRight] = useState(!ulRef);

    useEffect(()=>{
        function setRight():void {
            if (!ulRef.current) return;

            setMaxRight(left > ulRef.current.scrollWidth - ulRef.current.clientWidth - 10);
        }

        setRight();
        window.addEventListener("resize", setRight);

        return ()=>{
            window.removeEventListener("resize", setRight);
        };
    }, [ulRef, components, left]);

    function scrollToLeft():void {
        // Scroll to the left 90% the width of the component with an smooth effect
        if (ulRef.current) {
            ulRef.current.scrollTo({
                left: left - (ulRef.current.clientWidth * 0.9),
                behavior: "smooth"
            });
        }
    }

    function scrollToRight():void {
        // Scroll to the right 90% the width of the component with an smooth effect
        if (ulRef.current) {
            ulRef.current.scrollTo({
                left: left + (ulRef.current.clientWidth * 0.9),
                behavior: "smooth"
            });
        }
    }

    return (
        <Fragment>
            <div className="flex items-center justify-between">
                <h2>{title}</h2>
                <div className="flex items-center">
                    <IconButton onClick={scrollToLeft} disabled={left === 0}>
                        <ArrowLeft/>
                    </IconButton>
                    <IconButton onClick={scrollToRight} disabled={maxRight}>
                        <ArrowRight/>
                    </IconButton>
                </div>
            </div>
            {type === "books" ? (
                <ul ref={ulRef} className="lg:px-4 flex gap-8 flex-nowrap overflow-x-auto no-scrollbar py-4" onScroll={(e)=>{
                    const {scrollLeft} = e.target as HTMLElement;

                    setLeft(scrollLeft);
                }}
                >
                    {components?.map((book)=>(
                        <BookComponent key={book._id} bookData={book as BookWithProgress} deck={deck}/>
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