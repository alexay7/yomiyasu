import React, {LiHTMLAttributes, useEffect} from "react";
import "./style.css";
import {CSSTransition} from "react-transition-group";
import {Checkbox, IconButton, MenuItem, Select, SelectChangeEvent} from "@mui/material";
import {Close} from "@mui/icons-material";
import {toast} from "react-toastify";
import {useSettingsStore} from "../../../stores/SettingsStore";

interface SettingsItemProps extends LiHTMLAttributes<HTMLLIElement> {
    label:string;
    childrenId:string;
    children:React.JSX.Element;
}

function SettingsItem(props:SettingsItemProps):React.ReactElement {
    const {label, children, childrenId, className, ...moreProps} = props;

    return (
        <li className={`flex items-center justify-between ${className}`} {...moreProps}>
            <div className="w-5/12 select-none text-sm lg:text-base">
                <label htmlFor={childrenId}>{label}</label>
            </div>
            <div className="w-6/12">
                {children}
            </div>
        </li>
    );
}

interface ReaderSettingsProps {
    showMenu:boolean;
    closeSettings:()=>void;
    iframeWindow:Window;
}

export function ReaderSettings(props:ReaderSettingsProps):React.ReactElement {
    const {readerSettings, modifyReaderSettings} = useSettingsStore();
    const {showMenu, iframeWindow, closeSettings} = props;

    function setRightToLeft():void {
        iframeWindow.postMessage({action:"setSettings", property:"r2l"});
        modifyReaderSettings("r2l", !readerSettings.r2l);
    }

    function setCtrlToPan():void {
        iframeWindow.postMessage({action:"setSettings", property:"ctrlToPan"});
        modifyReaderSettings("ctrlToPan", !readerSettings.ctrlToPan);
    }

    function setZoom(e:SelectChangeEvent):void {
        iframeWindow.postMessage({action:"setSettings", property:"defaultZoom", value:e.target.value});
        modifyReaderSettings("defaultZoomMode", e.target.value as "fit to screen" | "fit to width" | "original size" | "keep zoom level");
    }

    function setOcr():void {
        iframeWindow.postMessage({action:"setSettings", property:"ocr"});
        modifyReaderSettings("displayOCR", !readerSettings.displayOCR);
    }

    function setBorders():void {
        iframeWindow.postMessage({action:"setSettings", property:"borders"});
        modifyReaderSettings("textBoxBorders", !readerSettings.textBoxBorders);
    }

    function setDoublePage():void {
        iframeWindow.postMessage({action:"setSettings", property:"doublePage"});
        modifyReaderSettings("singlePageView", !readerSettings.singlePageView);
    }

    function setCoverPage():void {
        iframeWindow.postMessage({action:"setSettings", property:"coverPage"});
        modifyReaderSettings("hasCover", !readerSettings.hasCover);
    }

    function setFontSize(e:SelectChangeEvent):void {
        iframeWindow.postMessage({action:"setSettings", property:"fontSize", value:e.target.value});
        modifyReaderSettings("fontSize", e.target.value);
    }

    function setToggleBox():void {
        iframeWindow.postMessage({action:"setSettings", property:"toggleBoxes"});
        modifyReaderSettings("toggleOCRTextBoxes", !readerSettings.toggleOCRTextBoxes);
    }

    function setZoomPan():void {
        if (readerSettings.panAndZoom) {
            iframeWindow.postMessage({action:"setSettings", property:"disableZoom"});
        } else {
            iframeWindow.postMessage({action:"setSettings", property:"enableZoom"});
        }
        modifyReaderSettings("panAndZoom", !readerSettings.panAndZoom);
    }

    function setFont(e:SelectChangeEvent):void {
        iframeWindow.document.body.style.setProperty("--user-font", e.target.value);

        modifyReaderSettings("fontFamily", e.target.value);
    }

    function setDictionary():void {
        modifyReaderSettings("nativeDictionary", !readerSettings.nativeDictionary);
    }

    function setDictVersion(e:SelectChangeEvent):void {
        modifyReaderSettings("dictionaryVersion", e.target.value as "word" | "sentence");
        window.location.reload();
    }

    function setScrollChange():void {
        modifyReaderSettings("scrollChange", !readerSettings.scrollChange);
        window.location.reload();
    }

    useEffect(()=>{
        function handleKeyDown(e:KeyboardEvent):void {
            switch (e.key) {
                case "m":{
                    const zooms = ["fit to screen", "fit to width", "original size", "keep zoom level"];
                    const zoomIndex = zooms.indexOf(readerSettings.defaultZoomMode);
                    const newZoom = zoomIndex < 3 ? zooms[zoomIndex + 1] : zooms[0];
                    iframeWindow.postMessage({action:"setSettings", property:"defaultZoom", value:newZoom});

                    modifyReaderSettings("defaultZoomMode", newZoom as "fit to screen" | "fit to width" | "original size" | "keep zoom level");
                    toast.success(`Nuevo modo de zoom: ${newZoom}`);
                    break;
                }
                case "d":{
                    iframeWindow.postMessage({action:"setSettings", property:"doublePage"});
                    toast.success(`Double paginación ${readerSettings.singlePageView ? "activada" : "desactivada"}`);

                    modifyReaderSettings("singlePageView", !readerSettings.singlePageView);
                    break;
                }
                case "z":{
                    if (readerSettings.panAndZoom) {
                        iframeWindow.postMessage({action:"setSettings", property:"disableZoom"});
                        toast.success("Zoom&Pan desactivado");
                    } else {
                        iframeWindow.postMessage({action:"setSettings", property:"enableZoom"});
                        toast.success("Zoom&Pan activado");
                    }
                    modifyReaderSettings("panAndZoom", !readerSettings.panAndZoom);
                    break;
                }
            }
        }

        addEventListener("keydown", handleKeyDown);

        return ()=>{
            removeEventListener("keydown", handleKeyDown);
        };
    }, [iframeWindow, readerSettings, modifyReaderSettings]);

    return (
        <>
            <CSSTransition in={showMenu} timeout={300} classNames="blurred" unmountOnExit>
                <div className="dark:bg-black w-full h-[100svh] fixed top-0 left-0 z-10 opacity-40"
                    onClick={closeSettings}
                />
            </CSSTransition>
            <CSSTransition in={showMenu} timeout={300} classNames="readerconf" unmountOnExit>
                <div className="w-full lg:w-1/2 max-w-screen-sm absolute left-1/2 bottom-0 bg-transparent -translate-x-1/2 z-20">
                    <div className="flex px-4 gap-4 items-center py-2 bg-primary rounded-t-xl text-[#ebe8e3] dark:text-[#101010]">
                        <IconButton onClick={closeSettings}>
                            <Close className="text-[#ebe8e3] dark:text-[#101010]"/>
                        </IconButton>
                        <p className="text-lg">Ajustes del Lector</p>
                    </div>
                    <div className="flex flex-col dark:bg-[#1E1E1E] bg-white py-4 px-4 gap-2 h-[32rem] overflow-y-auto">
                        <p className="font-bold text-[#101010] dark:text-[#ebe8e3] text-xl py-1">Ajustes de YomiYasu</p>
                        <div className="ml-2 flex flex-col gap-2">
                            <SettingsItem className="dark:text-white" label="Activar diccionario nativo" childrenId="dict">
                                <div className="flex justify-end">
                                    <Checkbox id="dict" onClick={setDictionary} checked={readerSettings.nativeDictionary}/>
                                </div>
                            </SettingsItem>
                            {readerSettings.nativeDictionary && (
                                <SettingsItem className="dark:text-white" label="Versión de diccionario" childrenId="dictver">
                                    <div className="flex justify-end">
                                        <Select className="w-full" variant="standard" id="dictver" value={readerSettings.dictionaryVersion}
                                            onChange={(e)=>setDictVersion(e)}
                                        >
                                            <MenuItem value="word">Click para buscar (más precisión, busca palabra)</MenuItem>
                                            <MenuItem value="sentence">Seleccionar para buscar (menos precisión, busca frase)</MenuItem>
                                        </Select>
                                    </div>
                                </SettingsItem>
                            )}
                            <SettingsItem className="dark:text-white" label="Activar scroll para cambiar de página" childrenId="scroll">
                                <div className="flex justify-end">
                                    <Checkbox id="scroll" onClick={setScrollChange} checked={readerSettings.scrollChange}/>
                                </div>
                            </SettingsItem>
                        </div>
                        <p className="font-bold text-[#101010] dark:text-[#ebe8e3] text-xl py-1">Ajustes de Mokuro</p>
                        <div className="ml-2 flex flex-col gap-2">
                            <SettingsItem className="dark:text-white" label="Activar Zoom&Pan" childrenId="zoompan">
                                <div className="flex justify-end">
                                    <Checkbox id="zoompan" onClick={setZoomPan} checked={readerSettings.panAndZoom}/>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Mostrar doble página" childrenId="doublepage">
                                <div className="flex justify-end">
                                    <Checkbox id="doublepage" onClick={setDoublePage} checked={!readerSettings.singlePageView}/>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Primera página es portada" childrenId="coverpage">
                                <div className="flex justify-end">
                                    <Checkbox id="coverpage" onClick={setCoverPage} checked={readerSettings.hasCover}/>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Leer de derecha a izquierda" childrenId="r2l">
                                <div className="flex justify-end">
                                    <Checkbox id="r2l" onClick={setRightToLeft} checked={readerSettings.r2l}/>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Tipo de fuente" childrenId="font">
                                <div className="flex justify-end">
                                    <Select className="w-full" variant="standard" id="font" value={readerSettings.fontFamily} onChange={(e)=>setFont(e)}>
                                        <MenuItem value="Zen Antique">Zen Antique</MenuItem>
                                        <MenuItem value="IPA">IPAex Gothic</MenuItem>
                                        <MenuItem value="Noto Sans JP">Noto Sans Japanese</MenuItem>
                                    </Select>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Ctrl para moverse por el libro (PC)" childrenId="ctrl">
                                <div className="flex justify-end">
                                    <Checkbox id="ctrl" onClick={setCtrlToPan} checked={readerSettings.ctrlToPan}/>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Zoom al pasar de página" childrenId="zoom">
                                <div className="flex justify-end">
                                    <Select className="w-full" variant="standard" id="zoom" value={readerSettings.defaultZoomMode} onChange={(e)=>setZoom(e)}>
                                        <MenuItem value="fit to screen">Ajustar verticalmente</MenuItem>
                                        <MenuItem value="fit to width">Ajustar horizontalmente</MenuItem>
                                        <MenuItem value="original size">Tamaño Original</MenuItem>
                                        <MenuItem value="keep zoom level">Mantener Zoom</MenuItem>
                                    </Select>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Mostrar OCR" childrenId="ocr">
                                <div className="flex justify-end">
                                    <Checkbox id="ocr" onClick={setOcr} checked={readerSettings.displayOCR}/>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Mostrar bordes en cuadros de texto" childrenId="borders">
                                <div className="flex justify-end">
                                    <Checkbox id="borders" onClick={setBorders} checked={readerSettings.textBoxBorders}/>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Tamaño del texto" childrenId="fontsize">
                                <div className="flex justify-end">
                                    <Select className="w-full" variant="standard" id="zoom" value={readerSettings.fontSize} onChange={(e)=>setFontSize(e)}>
                                        <MenuItem value="auto">Auto</MenuItem>
                                        <MenuItem value="10">Pequeño</MenuItem>
                                        <MenuItem value="20">Normal</MenuItem>
                                        <MenuItem value="40">Grande</MenuItem>
                                    </Select>
                                </div>
                            </SettingsItem>
                            <SettingsItem className="dark:text-white" label="Mantener texto al hacer click" childrenId="togglebox">
                                <div className="flex justify-end">
                                    <Checkbox id="togglebox" onClick={setToggleBox} checked={readerSettings.toggleOCRTextBoxes}/>
                                </div>
                            </SettingsItem>
                        </div>
                    </div>
                </div>
            </CSSTransition>
        </>
    );
}