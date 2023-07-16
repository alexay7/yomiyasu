import React, {LiHTMLAttributes} from "react";
import "./style.css";
import {CSSTransition} from "react-transition-group";
import {Checkbox, IconButton, MenuItem, Select, SelectChangeEvent} from "@mui/material";
import {Close} from "@mui/icons-material";
import {ReaderConfig} from "../../../types/readerSettings";

interface SettingsItemProps extends LiHTMLAttributes<HTMLLIElement> {
    label:string;
    childrenId:string;
    children:React.JSX.Element;
}

function SettingsItem(props:SettingsItemProps):React.ReactElement {
    const {label, children, childrenId, className, ...moreProps} = props;

    return (
        <li className={`flex items-center ${className}`} {...moreProps}>
            <div className="w-5/12 select-none">
                <label htmlFor={childrenId}>{label}</label>
            </div>
            <div className="w-7/12">
                {children}
            </div>
        </li>
    );
}

interface ReaderSettingsProps {
    showMenu:boolean;
    closeSettings:()=>void;
    iframeWindow:Window;
    currentSettings:ReaderConfig;
    setCurrentSettings:(value: React.SetStateAction<ReaderConfig | null>) => void
}

export function ReaderSettings(props:ReaderSettingsProps):React.ReactElement {
    const {showMenu, iframeWindow, closeSettings, currentSettings, setCurrentSettings} = props;

    function setDoublePage():void {
        iframeWindow.postMessage({action:"setSettings", property:"doublePage"});
        setCurrentSettings((prev)=>{
            if (!prev) return null;
            return ({...prev, singlePageView:!prev.singlePageView});
        });
    }

    function setCoverPage():void {
        iframeWindow.postMessage({action:"setSettings", property:"coverPage"});
        setCurrentSettings((prev)=>{
            if (!prev) return null;
            return ({...prev, hasCover:!prev.hasCover});
        });
    }

    function setZoom(e:SelectChangeEvent):void {
        iframeWindow.postMessage({action:"setSettings", property:"defaultZoom", value:e.target.value});
        setCurrentSettings((prev)=>{
            if (!prev) return null;
            return ({...prev, defaultZoomMode:e.target.value});
        });
    }

    return (
        <>
            <CSSTransition in={showMenu} timeout={300} classNames="blurred" unmountOnExit>
                <div className="bg-black w-full h-screen fixed top-0 left-0 z-10 opacity-40"
                    onClick={closeSettings}
                />
            </CSSTransition>
            <CSSTransition in={showMenu} timeout={300} classNames="readerconf" unmountOnExit>
                <div className="w-1/2 absolute left-1/2 bottom-0 bg-transparent -translate-x-1/2 z-20">
                    <div className="flex px-4 gap-4 items-center py-2 bg-primary rounded-t-xl text-white">
                        <IconButton onClick={closeSettings}>
                            <Close/>
                        </IconButton>
                        <p className="text-lg">Ajustes del Lector</p>
                    </div>
                    <div className="flex flex-col bg-[#1E1E1E] py-2 px-4 gap-2">
                        <p className="font-bold text-[#BCBCBC] text-xl py-1">Ajustes de Mokuro</p>
                        <SettingsItem className="text-white" label="Mostrar doble página" childrenId="doublepage">
                            <div className="flex justify-end">
                                <Checkbox id="doublepage" onClick={setDoublePage} checked={!currentSettings.singlePageView}/>
                            </div>
                        </SettingsItem>
                        <SettingsItem className="text-white" label="Primera página es portada" childrenId="coverpage">
                            <div className="flex justify-end">
                                <Checkbox id="coverpage" onClick={setCoverPage} checked={currentSettings.hasCover}/>
                            </div>
                        </SettingsItem>
                        <SettingsItem className="text-white" label="Ajustes de Zoom" childrenId="zoom">
                            <div className="flex justify-end">
                                <Select id="zoom" value={currentSettings.defaultZoomMode} onChange={(e)=>setZoom(e)}>
                                    <MenuItem value="fit to screen">Screen</MenuItem>
                                    <MenuItem value="fit to width">Fit</MenuItem>
                                    <MenuItem value="original size">Original</MenuItem>
                                    <MenuItem value="keep zoom level">Keep</MenuItem>
                                </Select>
                            </div>
                        </SettingsItem>
                    </div>
                </div>
            </CSSTransition>
        </>
    );
}