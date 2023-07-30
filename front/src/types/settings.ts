export interface ReaderConfig {
    fontFamily:string;
    r2l:boolean; // activa el modo derecha-a-izquierda
    ctrlToPan:boolean; // hace falta pulsar ctrl para hacer zoom (solo pc)
    defaultZoomMode:"fit to screen" | "fit to width" | "original size" | "keep zoom level"; // zoom que se hace al pasar de página
    displayOCR:boolean; // activa el texto generado por el ocr
    singlePageView:boolean; // vista a página simple
    hasCover:boolean; // la primera pág del libro es la portada
    textBoxBorders:boolean; // muestra los cuadros de texto de los bocadillos
    fontSize:string; // tamaño de fuente del ocr
    toggleOCRTextBoxes:boolean; // mantiene el texto de un cuadro al hacer click
    panAndZoom:boolean; // activa el zoom nativo de mokuro
}

export interface FullReaderConfig extends ReaderConfig {
    page_idx:number,
    page2_idx:number
}

export interface SiteConfig {
    openHTML:boolean;
    characters:boolean;
    autoCrono:boolean;
}