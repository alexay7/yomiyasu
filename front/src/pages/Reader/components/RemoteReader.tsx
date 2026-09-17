import {CircleArrowLeft, CircleArrowRight, CircleQuestionMark, Languages, Maximize, Minimize, PanelRight, Settings, SkipBack, SkipForward} from "lucide-react";
import React, { Fragment, type SetStateAction, useState } from "react";
import { StopWatchMenu } from "./StopWatchMenu";
import { Book, BookProgress } from "../../../types/book";
import { useSettingsStore } from "../../../stores/SettingsStore";
import { useMediaQuery } from "../../../lib/useMediaQuery";
import { nextBook, prevBook } from "../../../helpers/book";
import { useNavigate } from "react-router";
import { useFullscreen } from "../../../helpers/useFullscreen";
import { injectMokuroShim, readMokuroSettings } from "../../../lib/mokuro";
import { IconButton } from "../../../ui/IconButton";
import { Tooltip } from "../../../ui/Tooltip";
import { MobilePageArrows, ReaderBottomBar, ReaderNavButton, ReaderStatsReadout, ReaderTopBar, ReadingTimerIndicator } from "./ReaderChrome";

type RemoteReaderProps = {
    readerVars:{
        bookData:Book;
        bookProgress?:BookProgress;
        currentPage:number;
        iframe:React.RefObject<HTMLIFrameElement | null>;
        showSettings:boolean;
        setShowSettings:(v:boolean)=>void;
        doublePages:boolean;
        setOpenTextSidebar:(v:SetStateAction<boolean>)=>void;
        setShowShortcuts:(v:SetStateAction<boolean>)=>void;
        /** Guarda el progreso actual (lo gestiona el contenedor Reader). */
        saveProgress:(keepAlive?:boolean)=>Promise<void>;
    }
}

export default function RemoteReader({readerVars:{bookData, currentPage, bookProgress,
    iframe, setShowSettings, doublePages, setOpenTextSidebar, setShowShortcuts, saveProgress
}}:RemoteReaderProps):React.ReactElement{
    const {readerSettings,siteSettings}=useSettingsStore();
    const {isFullscreen,toggleFullscreen}=useFullscreen();

    const [showToolBar, setShowToolbar] = useState(true);

    const navigate = useNavigate();

    const isTabletOrMobile = useMediaQuery("(max-width: 1224px)");

    // Función que manda orden al iframe de cambiar de página
    function setPage(newPage:number):void {
        iframe.current?.contentWindow?.postMessage({action:"setPage", page:newPage});
    }

    /**
     * Esta función modifica el código del script incluido en el mokuro
     * para hacerlo compatible con el formato iframe dentro de otro documento.
     */
    function injectCustomScript():void {
        if (!iframe || !iframe.current || !bookData) return;

        const stored = readMokuroSettings(bookData);

        injectMokuroShim({
            iframe: iframe.current,
            settings: readerSettings,
            storedSettings: stored,
            onToggleToolbar: ()=>setShowToolbar((prev)=>!prev),
            totalPages: bookData.pages
        });
    }

    function toggleSidebar():void {
        setOpenTextSidebar((prev)=>!prev);
    }

    function calculateCharacters():number {
        if (!bookData) return 0;

        if (currentPage > 1) {
            if (!doublePages) {
                return (bookData.pageChars || [0])[currentPage - 1] - (bookData.pageChars || [0])[currentPage - 2];
            }

            // Sumar los caracteres de las dos páginas
            return (bookData.pageChars || [0])[currentPage] - (bookData.pageChars || [0])[currentPage - 2];

        }
        return (bookData.pageChars || [0])[0];
    }

    function calculateCurrentCharacters():number {
        if (!bookData) return 0;

        if (currentPage > 1) {
            if (!doublePages) {
                return (bookData.pageChars || [0])[currentPage - 1];
            }

            // Sumar los caracteres de las dos páginas
            return (bookData.pageChars || [0])[currentPage];

        }
        return (bookData.pageChars || [0])[0];
    }

    function getTotalPages():number {
        if (!bookData) return 0;

        if (readerSettings.r2l) {
            if (readerSettings.hasCover && !readerSettings.singlePageView) {
                return bookData.pages - 1;
            }
        }
        return bookData.pages;
    }

    function getCurrentPage():number {
        if (currentPage === 0) return 1;
        return currentPage;
    }

    async function leaveTo(action:()=>void):Promise<void> {
        await saveProgress();
        action();
    }

    const sliderMax = readerSettings.hasCover && !readerSettings.singlePageView ? bookData.pages - 1 : bookData.pages;

    return(
        <Fragment>
        {showToolBar && (
            <ReaderTopBar
                title={bookData.visibleName}
                onBack={()=>{
                    void (async()=>{
                        await saveProgress();
                        navigate(-1);
                    })();
                }}
            >
                <Tooltip content={`${calculateCharacters()} caracteres`}>
                    <IconButton label="Caracteres de la página" className="text-app-text">
                        <Languages />
                    </IconButton>
                </Tooltip>
                <StopWatchMenu characters={calculateCurrentCharacters()} oldProgress={bookProgress} bookData={bookData}
                    currentPage={currentPage}
                />
                <ReaderNavButton tooltip="Atajos de teclado (?)" onClick={()=>setShowShortcuts(true)}>
                    <CircleQuestionMark />
                </ReaderNavButton>
                <ReaderNavButton
                    tooltip={isFullscreen ? "Salir de pantalla completa (f)" : "Pantalla completa (f)"}
                    onClick={toggleFullscreen}
                >
                    {isFullscreen ? <Minimize /> : <Maximize />}
                </ReaderNavButton>
                <ReaderNavButton tooltip="Ajustes del lector" onClick={()=>setShowSettings(true)}>
                    <Settings />
                </ReaderNavButton>
                <ReaderNavButton tooltip="Mostrar caracteres por separado" onClick={toggleSidebar}>
                    <PanelRight />
                </ReaderNavButton>
            </ReaderTopBar>
        )}
        <iframe
            ref={iframe}
            src={`/api/static/${bookData.variant}s/${bookData?.seriePath}/${bookData?.path}.html`}
            className="w-full measure"
            onLoad={injectCustomScript}
        />
        <ReadingTimerIndicator enabled={siteSettings.showCrono}/>
        <MobilePageArrows
            currentPage={currentPage}
            pages={bookData.pages}
            visible={!showToolBar && isTabletOrMobile}
            onPrev={()=>iframe.current?.contentWindow?.postMessage({action:"goLeft"})}
            onNext={()=>iframe.current?.contentWindow?.postMessage({action:"goRight"})}
        />
        {showToolBar && (
            <ReaderBottomBar
                r2l={readerSettings.r2l}
                currentPage={currentPage}
                maxPage={sliderMax}
                onPageChange={setPage}
                overlay={<ReaderStatsReadout bookData={bookData} currentPage={currentPage} doublePages={doublePages} />}
                left={readerSettings.r2l ? (
                    <Fragment>
                        <ReaderNavButton tooltip="Ir al siguiente libro" onClick={()=>void leaveTo(()=>void nextBook({book:bookData, variant:"manga", navigate}))}>
                            <CircleArrowLeft />
                        </ReaderNavButton>
                        <ReaderNavButton tooltip="Ir a la última página" onClick={()=>setPage(bookData.pages)}>
                            <SkipBack />
                        </ReaderNavButton>
                        <p>{getTotalPages()}</p>
                    </Fragment>
                ) : (
                    <Fragment>
                        <ReaderNavButton tooltip="Ir al libro anterior" onClick={()=>void leaveTo(()=>void prevBook({book:bookData, variant:"manga", navigate}))}>
                            <CircleArrowLeft />
                        </ReaderNavButton>
                        <ReaderNavButton tooltip="Ir a la primera página" onClick={()=>setPage(1)}>
                            <SkipBack />
                        </ReaderNavButton>
                        <p>{getCurrentPage()}</p>
                    </Fragment>
                )}
                right={!readerSettings.r2l ? (
                    <Fragment>
                        <p>{getTotalPages()}</p>
                        <ReaderNavButton tooltip="Ir a la última página" onClick={()=>setPage(bookData.pages)}>
                            <SkipForward />
                        </ReaderNavButton>
                        <ReaderNavButton tooltip="Ir al siguiente libro" onClick={()=>void leaveTo(()=>void nextBook({book:bookData, variant:"manga", navigate}))}>
                            <CircleArrowRight />
                        </ReaderNavButton>
                    </Fragment>
                ) : (
                    <Fragment>
                        <p>{getCurrentPage()}</p>
                        <ReaderNavButton tooltip="Ir a la primera página" onClick={()=>setPage(1)}>
                            <SkipForward />
                        </ReaderNavButton>
                        <ReaderNavButton tooltip="Ir al libro anterior" onClick={()=>void leaveTo(()=>void prevBook({book:bookData, variant:"manga", navigate}))}>
                            <CircleArrowRight />
                        </ReaderNavButton>
                    </Fragment>
                )}
            />
        )}
    </Fragment>
    )
}
