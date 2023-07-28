import {Close} from "@mui/icons-material";
import {IconButton} from "@mui/material";
import React, {Fragment} from "react";
import {CSSTransition} from "react-transition-group";
import "./style.css";
import {useSettings} from "../../../contexts/SettingsContext";

interface PageTextProps {
    lines:string[][][];
    open:boolean;
    setOpen:(v:React.SetStateAction<boolean>)=>void;
}

export function PageText(props:PageTextProps):React.ReactElement {
    const {open, setOpen} = props;
    const {readerSettings} = useSettings();

    const {lines} = props;

    function getPageName(index:number):string {
        if (readerSettings.singlePageView) return "";
        if (index === 0) {
            return readerSettings.r2l ? "Derecha" : "Izquierda";
        }
        return readerSettings.r2l ? "Izquierda" : "Derecha";
    }

    return (
        <Fragment>
            <CSSTransition classNames="textbox" in={open} timeout={300} unmountOnExit>
                <div className="h-screen flex w-[400px] fixed top-0 z-20 pt-14 bg-black bg-opacity-70 justify-center">
                    <IconButton className="absolute top-0 right-0" onClick={()=>setOpen(false)}>
                        <Close/>
                    </IconButton>
                    <ul className="flex h-5/6 flex-col px-4 gap-4 text-white overflow-y-auto">
                        {lines.map((page, i)=>(
                            <Fragment key={`${i}`}>
                                <p className="text-center text-xl font-semibold">{getPageName(i)}</p>
                                <li className="border shadow-lg shadow-black border-white border-solid p-2 rounded-md bg-[#272727] bg-opacity-80">
                                    <ul className="flex flex-col gap-4">
                                        {page.map((koma, j)=>(
                                            <li key={`${i}-${j}`}>
                                                <ul className="flex flex-col gap-2">
                                                    {koma.map((text, k)=>(
                                                        <li key={`${i}-${j}-${k}`}>・{text}</li>
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