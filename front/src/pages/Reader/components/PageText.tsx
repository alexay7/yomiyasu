import {GripHorizontal, GripVertical, X} from "lucide-react";
import React, {Fragment, useRef, useState} from "react";
import {IconButton} from "../../../ui/IconButton";
import {cn} from "../../../ui/cn";
import {useMediaQuery} from "../../../lib/useMediaQuery";
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
    const isTabletOrMobile = useMediaQuery("(max-width: 1024px)");

    const {lines} = props;

    function getPageName(index:number):string {
        if (readerSettings.singlePageView) return "";
        if (index === 0) {
            return readerSettings.r2l ? "Derecha" : "Izquierda";
        }
        return readerSettings.r2l ? "Izquierda" : "Derecha";
    }

    const [initialPos, setInitialPos] = useState(0);
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
            const event = e as React.TouchEvent<HTMLButtonElement>;
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
            const event = e as React.TouchEvent<HTMLButtonElement>;
            if (!sidebarRef || !sidebarRef.current || event.targetTouches[0].clientY === 0) return;

            if (x) {
                sidebarRef.current.style.width = `${initialSize + event.targetTouches[0].clientX - initialPos}px`;
            } else {
                sidebarRef.current.style.height = `${initialSize - event.targetTouches[0].clientY + initialPos}px`;
            }
        }
    };

    return (
        <div
            ref={sidebarRef}
            aria-hidden={!open}
            className={cn(
                "fixed z-20 flex justify-center border-app-border bg-black/75 transition-transform duration-300 ease-out",
                // Móvil: hoja inferior
                "inset-x-0 bottom-0 max-h-[80%] min-h-[10%] w-full border-t",
                open ? "translate-y-0" : "translate-y-full",
                // Escritorio: panel lateral izquierdo
                "lg:inset-y-0 lg:left-0 lg:h-full lg:max-h-none lg:w-[min(80%,720px)] lg:min-w-[400px] lg:border-r lg:border-t-0",
                open ? "lg:translate-x-0" : "lg:-translate-x-full",
                !open && "pointer-events-none",
            )}
        >
            {isTabletOrMobile ? (
                <IconButton
                    label="Redimensionar panel"
                    draggable
                    className="absolute right-1/2 top-0 z-30 mx-2 translate-x-1/2 cursor-row-resize touch-none"
                    onDragStart={initial}
                    onDrag={resize}
                    onTouchStart={(e)=>initial(e, true)}
                    onTouchMove={(e)=>resize(e, true)}
                >
                    <GripHorizontal />
                </IconButton>
            ) : (
                <IconButton
                    label="Redimensionar panel"
                    draggable
                    className="absolute right-0 top-1/2 z-30 mx-2 -translate-y-1/2 cursor-col-resize"
                    onDragStart={(e)=>initial(e, false, true)}
                    onDrag={(e)=>resize(e, false, true)}
                    onTouchStart={(e)=>initial(e, true, true)}
                    onTouchMove={(e)=>resize(e, true, true)}
                >
                    <GripVertical />
                </IconButton>
            )}

            <IconButton label="Cerrar panel de texto" className="absolute right-2 top-2 z-30 text-white" onClick={()=>setOpen(false)}>
                <X />
            </IconButton>

            <ul className="mt-12 flex flex-col gap-4 overflow-y-auto px-4 pb-6 text-white lg:mt-16 lg:h-5/6 lg:pr-12">
                {lines.map((page, i)=>(
                    <Fragment key={`${i}`}>
                        <p className="text-center text-xl font-semibold">{getPageName(i)}</p>
                        <li className="rounded-md border border-white/70 bg-black/80 p-3 shadow-lg">
                            <ul className="flex flex-col gap-4">
                                {page.map((koma, j)=>(
                                    <li key={`${i}-${j}`}>
                                        <ul className="flex flex-col gap-2">
                                            {koma.map((text, k)=>(
                                                <li key={`${i}-${j}-${k}`} className="flex gap-2">
                                                    ・ <p data-searchable>{text.join("")}</p>
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
    );
}
