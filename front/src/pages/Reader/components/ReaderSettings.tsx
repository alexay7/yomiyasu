import {Settings} from "lucide-react";
import React, {type ReactNode} from "react";
import {useMediaQuery} from "../../../lib/useMediaQuery";
import {useSettingsStore} from "../../../stores/SettingsStore";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../../ui/Select";
import {Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "../../../ui/Sheet";
import {Switch} from "../../../ui/Switch";

interface SettingRowProps {
    label:string;
    htmlFor?:string;
    children:ReactNode;
}

function SettingRow({label, htmlFor, children}:SettingRowProps):React.ReactElement {
    return (
        <div className="flex items-center justify-between gap-4 py-1">
            <label htmlFor={htmlFor} className="flex-1 select-none text-sm text-fg">{label}</label>
            <div className="w-6/12 shrink-0">{children}</div>
        </div>
    );
}

interface ReaderSettingsProps {
    showMenu:boolean;
    closeSettings:()=>void;
    /** Ventana del iframe de mokuro; null en el lector de imágenes. */
    iframeWindow?:Window | null;
    /** "mokuro" (iframe) o "images" (carpeta de imágenes sin OCR). */
    mode?:"mokuro" | "images";
}

export function ReaderSettings(props:ReaderSettingsProps):React.ReactElement {
    const {readerSettings, modifyReaderSettings} = useSettingsStore();
    const {showMenu, iframeWindow = null, closeSettings, mode = "mokuro"} = props;
    const isTabletOrMobile = useMediaQuery("(max-width: 1224px)");
    const isImages = mode === "images";

    function post(property:string, value?:string):void {
        iframeWindow?.postMessage({action:"setSettings", property, value});
    }

    return (
        <Sheet
            open={showMenu}
            onOpenChange={(value)=>{
                if (!value) closeSettings();
            }}
        >
            <SheetContent side="bottom" className="sm:mx-auto sm:max-w-screen-sm lg:max-w-xl">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Settings className="size-4 text-fg-muted" />
                        Ajustes del lector
                    </SheetTitle>
                    <SheetDescription>Los cambios se aplican al instante</SheetDescription>
                </SheetHeader>

                <SheetBody className="flex flex-col gap-5">
                    <section className="flex flex-col">
                        <h3 className="pb-1 text-[13px] font-semibold uppercase tracking-wider text-fg-muted/80">YomiYasu</h3>
                        {!isImages ? (
                            <SettingRow label="Activar diccionario nativo" htmlFor="setting-dict">
                                <div className="flex justify-end">
                                    <Switch
                                        id="setting-dict"
                                        checked={readerSettings.nativeDictionary}
                                        onCheckedChange={(checked)=>modifyReaderSettings("nativeDictionary", checked)}
                                    />
                                </div>
                            </SettingRow>
                        ) : null}
                        {!isImages && readerSettings.nativeDictionary && !isTabletOrMobile ? (
                            <SettingRow label="Versión de diccionario" htmlFor="setting-dictver">
                                <Select
                                    value={readerSettings.dictionaryVersion}
                                    onValueChange={(value)=>{
                                        modifyReaderSettings("dictionaryVersion", value as "word" | "sentence");
                                        window.location.reload();
                                    }}
                                >
                                    <SelectTrigger id="setting-dictver" className="h-8 text-[13px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="word">Click para buscar</SelectItem>
                                        <SelectItem value="sentence">Seleccionar para buscar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </SettingRow>
                        ) : null}
                        <SettingRow label="Scroll para cambiar de página" htmlFor="setting-scroll">
                            <div className="flex justify-end">
                                <Switch
                                    id="setting-scroll"
                                    checked={readerSettings.scrollChange}
                                    onCheckedChange={(checked)=>{
                                        modifyReaderSettings("scrollChange", checked);
                                        if (!isImages) window.location.reload();
                                    }}
                                />
                            </div>
                        </SettingRow>
                    </section>

                    <section className="flex flex-col">
                        <h3 className="pb-1 text-[13px] font-semibold uppercase tracking-wider text-fg-muted/80">{isImages ? "Lector" : "Mokuro"}</h3>
                        <SettingRow label="Activar Zoom y Pan" htmlFor="setting-zoompan">
                            <div className="flex justify-end">
                                <Switch
                                    id="setting-zoompan"
                                    checked={readerSettings.panAndZoom}
                                    onCheckedChange={(checked)=>{
                                        post(checked ? "enableZoom" : "disableZoom");
                                        modifyReaderSettings("panAndZoom", checked);
                                    }}
                                />
                            </div>
                        </SettingRow>
                        <SettingRow label="Mostrar doble página" htmlFor="setting-doublepage">
                            <div className="flex justify-end">
                                <Switch
                                    id="setting-doublepage"
                                    checked={!readerSettings.singlePageView}
                                    onCheckedChange={(checked)=>{
                                        post("doublePage");
                                        modifyReaderSettings("singlePageView", !checked);
                                    }}
                                />
                            </div>
                        </SettingRow>
                        <SettingRow label="Primera página es portada" htmlFor="setting-cover">
                            <div className="flex justify-end">
                                <Switch
                                    id="setting-cover"
                                    checked={readerSettings.hasCover}
                                    onCheckedChange={(checked)=>{
                                        post("coverPage");
                                        modifyReaderSettings("hasCover", checked);
                                    }}
                                />
                            </div>
                        </SettingRow>
                        <SettingRow label="Leer de derecha a izquierda" htmlFor="setting-r2l">
                            <div className="flex justify-end">
                                <Switch
                                    id="setting-r2l"
                                    checked={readerSettings.r2l}
                                    onCheckedChange={(checked)=>{
                                        post("r2l");
                                        modifyReaderSettings("r2l", checked);
                                    }}
                                />
                            </div>
                        </SettingRow>
                        {!isImages ? (
                            <>
                                <SettingRow label="Tipo de fuente" htmlFor="setting-font">
                                    <Select
                                        value={readerSettings.fontFamily}
                                        onValueChange={(value)=>{
                                            iframeWindow?.document.body.style.setProperty("--user-font", value);
                                            modifyReaderSettings("fontFamily", value);
                                        }}
                                    >
                                        <SelectTrigger id="setting-font" className="h-8 text-[13px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Zen Antique">Zen Antique</SelectItem>
                                            <SelectItem value="IPA">IPAex Gothic</SelectItem>
                                            <SelectItem value="Noto Sans JP">Noto Sans Japanese</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </SettingRow>
                                <SettingRow label="Ctrl para moverse por el libro (PC)" htmlFor="setting-ctrl">
                                    <div className="flex justify-end">
                                        <Switch
                                            id="setting-ctrl"
                                            checked={readerSettings.ctrlToPan}
                                            onCheckedChange={(checked)=>{
                                                post("ctrlToPan");
                                                modifyReaderSettings("ctrlToPan", checked);
                                            }}
                                        />
                                    </div>
                                </SettingRow>
                            </>
                        ) : null}
                        <SettingRow label="Zoom al pasar de página" htmlFor="setting-zoom">
                            <Select
                                value={readerSettings.defaultZoomMode}
                                onValueChange={(value)=>{
                                    post("defaultZoom", value);
                                    modifyReaderSettings("defaultZoomMode", value as "fit to screen" | "fit to width" | "original size" | "keep zoom level");
                                }}
                            >
                                <SelectTrigger id="setting-zoom" className="h-8 text-[13px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fit to screen">Ajustar verticalmente</SelectItem>
                                    <SelectItem value="fit to width">Ajustar horizontalmente</SelectItem>
                                    <SelectItem value="original size">Tamaño original</SelectItem>
                                    <SelectItem value="keep zoom level">Mantener zoom</SelectItem>
                                </SelectContent>
                            </Select>
                        </SettingRow>
                        {!isImages ? (
                            <>
                                <SettingRow label="Mostrar OCR" htmlFor="setting-ocr">
                                    <div className="flex justify-end">
                                        <Switch
                                            id="setting-ocr"
                                            checked={readerSettings.displayOCR}
                                            onCheckedChange={(checked)=>{
                                                post("ocr");
                                                modifyReaderSettings("displayOCR", checked);
                                            }}
                                        />
                                    </div>
                                </SettingRow>
                                <SettingRow label="Bordes en cuadros de texto" htmlFor="setting-borders">
                                    <div className="flex justify-end">
                                        <Switch
                                            id="setting-borders"
                                            checked={readerSettings.textBoxBorders}
                                            onCheckedChange={(checked)=>{
                                                post("borders");
                                                modifyReaderSettings("textBoxBorders", checked);
                                            }}
                                        />
                                    </div>
                                </SettingRow>
                                <SettingRow label="Tamaño del texto" htmlFor="setting-fontsize">
                                    <Select
                                        value={readerSettings.fontSize}
                                        onValueChange={(value)=>{
                                            post("fontSize", value);
                                            modifyReaderSettings("fontSize", value);
                                        }}
                                    >
                                        <SelectTrigger id="setting-fontsize" className="h-8 text-[13px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="auto">Auto</SelectItem>
                                            <SelectItem value="10">Pequeño</SelectItem>
                                            <SelectItem value="20">Normal</SelectItem>
                                            <SelectItem value="40">Grande</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </SettingRow>
                                <SettingRow label="Mantener texto al hacer click" htmlFor="setting-togglebox">
                                    <div className="flex justify-end">
                                        <Switch
                                            id="setting-togglebox"
                                            checked={readerSettings.toggleOCRTextBoxes}
                                            onCheckedChange={(checked)=>{
                                                post("toggleBoxes");
                                                modifyReaderSettings("toggleOCRTextBoxes", checked);
                                            }}
                                        />
                                    </div>
                                </SettingRow>
                            </>
                        ) : null}
                    </section>
                </SheetBody>
            </SheetContent>
        </Sheet>
    );
}
