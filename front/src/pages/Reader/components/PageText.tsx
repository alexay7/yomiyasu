import {Close, DragHandle, DragIndicator} from "@mui/icons-material";
import {IconButton} from "@mui/material";
import React, {Fragment, useRef, useState} from "react";
import {CSSTransition} from "react-transition-group";
import "./style.css";
import {useMediaQuery} from "react-responsive";
import {useSettingsStore} from "../../../stores/SettingsStore";

interface PageTextProps {
    lines:string[][][][];
    open:boolean;
    setOpen:(v:React.SetStateAction<boolean>)=>void;
}

export function PageText(props:PageTextProps):React.ReactElement {
    const {open, setOpen} = props;
    const {readerSettings} = useSettingsStore();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isTabletOrMobile = useMediaQuery({query: "(max-width: 1024px)"});

    const {lines} = props;

    function getPageName(index:number):string {
        if (readerSettings.singlePageView) return "";
        if (index === 0) {
            return readerSettings.r2l ? "Derecha" : "Izquierda";
        }
        return readerSettings.r2l ? "Izquierda" : "Derecha";
    }

    const [initialPos,   setInitialPos] = useState(0);
    const [initialSize, setInitialSize] = useState(0);

    const initial = (e:React.DragEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>, mobile?:boolean, x?:boolean):void => {
        if (!sidebarRef || !sidebarRef.current) return;

        if (!mobile) {
            const event = e as React.DragEvent<HTMLButtonElement>;
            const img = new Image();
            // Elemento fantasma reemplazado por imagen vacía
            img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
            event.dataTransfer.setDragImage(img, 0, 0);

            if (x) {
                setInitialPos(event.clientX);
                setInitialSize(sidebarRef.current.offsetWidth);
            } else {
                setInitialPos(event.clientY);
                setInitialSize(sidebarRef.current.offsetHeight);
            }
        } else {
            const event = e as  React.TouchEvent<HTMLButtonElement>;
            if (x) {
                setInitialPos(event.targetTouches[0].clientX);
                setInitialSize(sidebarRef.current.offsetWidth);
            } else {
                setInitialPos(event.targetTouches[0].clientY);
                setInitialSize(sidebarRef.current.offsetHeight);
            }
        }
    };

    const resize = (e:React.DragEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>, mobile?:boolean, x?:boolean):void => {
        if (!mobile) {
            const event = e as React.DragEvent<HTMLButtonElement>;
            if (!sidebarRef || !sidebarRef.current || event.clientX === 0) return;

            if (x) {
                sidebarRef.current.style.width = `${initialSize + event.clientX - initialPos}px`;
            } else {
                sidebarRef.current.style.height = `${initialSize - event.clientY + initialPos}px`;
            }
        } else {
            const event = e as  React.TouchEvent<HTMLButtonElement>;
            if (!sidebarRef || !sidebarRef.current || event.targetTouches[0].clientY === 0) return;

            if (x) {
                sidebarRef.current.style.width = `${initialSize + event.targetTouches[0].clientX - initialPos}px`;
            } else {
                sidebarRef.current.style.height = `${initialSize - event.targetTouches[0].clientY + initialPos}px`;
            }
        }
    };

    return (
        <Fragment>
            <CSSTransition classNames="textbox" in={open} timeout={300} unmountOnExit>
                <div ref={sidebarRef} className="min-w-full lg:max-w-[80%] lg:min-w-[400px] max-h-[80%] lg:max-h-none min-h-[10%] pt-4 lg:h-full flex fixed lg:top-0 z-20 lg:pt-14 bg-black bg-opacity-70 justify-center border-0 border-r border-white border-solid">
                    {isTabletOrMobile ? (
                        <IconButton draggable={true} className="touch-none dragable mx-2 absolute top-0 translate-x-1/2 right-1/2 z-30 cursor-row-resize"
                            onDragStart={initial}
                            onDrag={resize}
                            onTouchStart={(e)=>{
                                initial(e, true);
                            }}
                            onTouchMove={(e)=>{
                                resize(e, true);
                            }}
                        >
                            <DragHandle/>
                        </IconButton>
                    ) : (
                        <IconButton draggable={true} className="dragable mx-2 absolute top-1/2 -translate-y-1/2 right-0 z-30 cursor-col-resize"
                            onDragStart={(e)=>initial(e, false, true)}
                            onDrag={(e)=>resize(e, false, true)}
                            onTouchStart={(e)=>{
                                initial(e, true, true);
                            }}
                            onTouchMove={(e)=>{
                                resize(e, true, true);
                            }}
                        >
                            <DragIndicator/>
                        </IconButton>
                    )}
                    <IconButton className="absolute top-0 right-0" onClick={()=>setOpen(false)}>
                        <Close/>
                    </IconButton>
                    <ul className="flex mt-4 lg:h-5/6 flex-col px-4 gap-4 text-white overflow-y-auto lg:pr-12">
                        {lines.map((page, i)=>(
                            <Fragment key={`${i}`}>
                                <p className="text-center text-xl font-semibold">{getPageName(i)}</p>
                                <li className="border shadow-lg shadow-black border-white border-solid p-2 rounded-md bg-[#101010] bg-opacity-80">
                                    <ul className="flex flex-col gap-4">
                                        {page.map((koma, j)=>(
                                            <li key={`${i}-${j}`}>
                                                <ul className="flex flex-col gap-2">
                                                    {koma.map((text, k)=>(
                                                        <li key={`${i}-${j}-${k}`} className="flex gap-2">
                                                            ・  <p>{text.join("")}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            </Fragment>
                        ))}
                    </ul>
                </div>
            </CSSTransition>
        </Fragment>
    );
}