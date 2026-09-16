import { PanelRight, Settings, SkipBack, SkipForward } from "lucide-react";
import React, { Fragment, type SetStateAction, useState } from "react";
import { StopWatchMenu } from "./StopWatchMenu";
import { useSettingsStore } from "../../../stores/SettingsStore";
import { useMediaQuery } from "../../../lib/useMediaQuery";
import { injectMokuroShim } from "../../../lib/mokuro";
import { MobilePageArrows, ReaderBottomBar, ReaderNavButton, ReaderTopBar, ReadingTimerIndicator } from "./ReaderChrome";

type LocalReaderProps = {
    readerVars:{
        currentPage:number;
        iframe:React.RefObject<HTMLIFrameElement | null>;
        showSettings:boolean;
        setShowSettings:(v:boolean)=>void;
        setOpenTextSidebar:(v:SetStateAction<boolean>)=>void;
        localHtml:string;
        pages:number;
        iframeOnLoad:()=>void;
        name:string;
        resetBook:()=>void;
    }
}

export default function LocalReader({readerVars:{currentPage,
    iframe,setShowSettings,setOpenTextSidebar,localHtml,pages,iframeOnLoad,name,resetBook
}}:LocalReaderProps):React.ReactElement{
    const {readerSettings,siteSettings}=useSettingsStore();

    const [showToolBar, setShowToolbar] = useState(true);

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
        if (!iframe || !iframe.current) return;

        injectMokuroShim({
            iframe: iframe.current,
            settings: readerSettings,
            onToggleToolbar: ()=>setShowToolbar((prev)=>!prev),
            onLoaded: iframeOnLoad
        });
    }

    function toggleSidebar():void {
        setOpenTextSidebar((prev)=>!prev);
    }

    const displayPage = currentPage === 0 ? 1 : currentPage;
    const sliderMax = readerSettings.hasCover && !readerSettings.singlePageView ? pages - 1 : pages;

    return(
        <Fragment>
        {showToolBar && (
            <ReaderTopBar title={name} onBack={resetBook} backLabel="Volver atrás">
                <StopWatchMenu currentPage={currentPage} />
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
            src={localHtml}
            className="w-full measure"
            onLoad={injectCustomScript}
        />
        <ReadingTimerIndicator enabled={siteSettings.showCrono}/>
        <MobilePageArrows
            iframe={iframe}
            currentPage={currentPage}
            pages={pages}
            visible={!showToolBar && isTabletOrMobile}
        />
        {showToolBar && (
            <ReaderBottomBar
                r2l={readerSettings.r2l}
                currentPage={currentPage}
                maxPage={sliderMax}
                onPageChange={setPage}
                left={readerSettings.r2l ? (
                    <Fragment>
                        <ReaderNavButton tooltip="Ir a la última página" onClick={()=>setPage(pages)}>
                            <SkipBack />
                        </ReaderNavButton>
                        <p>{pages}</p>
                    </Fragment>
                ) : (
                    <Fragment>
                        <ReaderNavButton tooltip="Ir a la primera página" onClick={()=>setPage(1)}>
                            <SkipBack />
                        </ReaderNavButton>
                        <p>{displayPage}</p>
                    </Fragment>
                )}
                right={!readerSettings.r2l ? (
                    <Fragment>
                        <p>{pages}</p>
                        <ReaderNavButton tooltip="Ir a la última página" onClick={()=>setPage(pages)}>
                            <SkipForward />
                        </ReaderNavButton>
                    </Fragment>
                ) : (
                    <Fragment>
                        <p>{displayPage}</p>
                        <ReaderNavButton tooltip="Ir a la primera página" onClick={()=>setPage(1)}>
                            <SkipForward />
                        </ReaderNavButton>
                    </Fragment>
                )}
            />
        )}
    </Fragment>
    )
}
