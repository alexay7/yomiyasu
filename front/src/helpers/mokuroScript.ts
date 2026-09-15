import {ReaderConfig} from "../types/settings";

/**
 * Estilos que se inyectan en el HTML generado por mokuro para adaptarlo al lector.
 */
export const mokuroStyles = `
            @font-face {
                font-family: "Zen Antique";
                src: url("/fonts/ZenAntique.ttf") format("truetype");;
            }
            @font-face {
                font-family: "IPA";
                src: url("/fonts/ipaexg.ttf") format("truetype");;
            }
    
            .pageContainer * { font-family: var(--user-font); }
            `;

/**
 * Script que se inyecta en el HTML generado por mokuro para hacerlo compatible
 * con el formato iframe dentro de otro documento.
 */
export function buildMokuroScript(readerSettings:ReaderConfig, options?:{clickDisplayOcr?:boolean}):string {
    const displayOcrClick = options?.clickDisplayOcr ? "document.getElementById(\"menuDisplayOCR\").click();" : "";

    return `
                (function(){
                    /**
                     * Recibe los mensajes del parent para realizar las acciones indicadas
                     */ 
                    let zoomEnabled = true;
                    ${displayOcrClick}
    
                        window.addEventListener("message",
                        (event) => {
                            if (event.origin !== window.location.origin) return;
                            
                            switch(event.data.action){
                                case "goRight":{
                                    inputRight();
                                    break;
                                };
                                case "goLeft":{
                                    inputLeft();
                                    break;
                                };
                                case "setPage":{
                                    updatePage(event.data.page-1);
                                    break;
                                };
                                case "getSettings":{
                                    window.parent.postMessage({"action":"settings",value:state},"*");
                                    break;
                                };
                                case "setSettings":{
                                    switch(event.data.property){
                                        case "r2l":{
                                            document.getElementById("menuR2l").click();
                                            break;
                                        };
                                        case "ctrlToPan":{
                                            document.getElementById("menuCtrlToPan").click();
                                            break;
                                        };
                                        case "doublePage":{
                                            document.getElementById("menuDoublePageView").click();
                                            break;
                                        };
                                        case "coverPage":{
                                            document.getElementById("menuHasCover").click();
                                            break;
                                        };
                                        case "borders":{
                                            document.getElementById("menuTextBoxBorders").click();
                                            break;
                                        };
                                        case "ocr":{
                                            document.getElementById("menuDisplayOCR").click();
                                            break;
                                        };
                                        case "fontSize":{
                                            document.getElementById("menuFontSize").value=event.data.value;
                                            const newEvent = new Event("change");
                                            document.getElementById("menuFontSize").dispatchEvent(newEvent);
                                            break;
                                        };
                                        case "defaultZoom":{
                                            document.getElementById("menuDefaultZoom").value=event.data.value;
                                            const newEvent = new Event("change");
                                            document.getElementById("menuDefaultZoom").dispatchEvent(newEvent);
                                            break;
                                        };
                                        case "toggleBoxes":{
                                            document.getElementById("menuToggleOCRTextBoxes").click();
                                            break;
                                        };
                                        case "enableZoom":{
                                            pz.resume();
                                            zoomEnabled=true;
                                            break;
                                        };
                                        case "disableZoom":{
                                            pz.pause();
                                            zoomEnabled=false;
                                            break;
                                        };
                                    }
                                }
                            };
                        });
    
                    // Permite cambiar de página con keybinds también dentro del iframe
                    document.body.addEventListener("keydown",(e)=>{
                        switch(e.key){
                            case "ArrowLeft":{
                                inputLeft();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                break;
                            };
                            case " ":{
                                inputLeft();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                break;
                            };
                            case "ArrowRight":{
                                inputRight();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                break;
                            };
                            default:{
                                window.parent.postMessage({action:"keypress",value:{key:e.key}},"*");
                            }
                        };
                    });
    
                    ${readerSettings.dictionaryVersion === "word" ?
            `
                    function sendClickedWord(e){
                        if (!event.target) return;
                        const target = event.target;
                        const text = target.textContent;
                        if (!text || target.tagName !== "P") return;
                        let clickedPosition = window.getSelection()?.focusOffset; // Obtiene la posición del clic
                        const extracted = text.slice(clickedPosition);
                        window.parent.postMessage({action:"selection",value:extracted},"*")
                    }
    
                    document.body.addEventListener("click",sendClickedWord)
                    ` : `
                    document.body.addEventListener("click",(e)=>{
                        if(window.getSelection().toString()){
                            window.parent.postMessage({action:"selection",value:window.getSelection().toString()},"*")
                        }
                    })
    
                    function addClickHandlersToParagraphs() {
                        const paragraphs = document.querySelectorAll('p');
                        // Add event listener to each <p> element
                        paragraphs.forEach(paragraph => {
                            paragraph.addEventListener('touchstart', () => {
                                // Retrieve the text content of the clicked <p> element
                                const textContent = paragraph.textContent;
            
                                // Display the text (you can customize this part)
                                window.parent.postMessage({ action: "selection", value: textContent });
                            });
                        });
                    }
            
                    addClickHandlersToParagraphs();                
                    `}
    
                    // Desactiva el menú de mokuro si así lo pone en ajustes
                    ${readerSettings.panAndZoom ? "" : "pz.pause();zoomEnabled=false;"}
    
                    // Oculta el menú de mokuro
                    document.getElementById('topMenu').style.display="none";
                    document.getElementById('showMenuA').style.display="none";
                    // Get color from localStorage
                    const color = window.localStorage.getItem("color-theme");
                    if (color === "dark") {
                        document.body.style.backgroundColor = "black";
                    } else {
                        document.body.style.backgroundColor = "white";
                    }
    
                    ${readerSettings.scrollChange ? `
                    // Permite pasar de página con swipes
                    var touchStart = null;
                    var touchEnd = null;
    
                    document.body.addEventListener("touchstart",(e)=>{
                        touchEnd = null;
                        touchStart = e.targetTouches[0].clientX;
                    });
    
                    document.body.addEventListener("touchmove",(e)=>{
                        if(zoomEnabled && e.targetTouches.length<2)return;
                        touchEnd = e.targetTouches[0].clientX;
                    });
    
                    document.body.addEventListener("touchend",(e)=>{
                        if (!touchStart || !touchEnd) return;
                        const distance = touchStart - touchEnd;
                        const isLeftSwipe = distance > 100;
                        const isRightSwipe = distance < -100;
                        if (isLeftSwipe){
                            inputRight();
                        }else if(isRightSwipe){
                            inputLeft();
                        }
                    });` : ""}
    
                    /**
                     * Reemplaza la función de pasar de página por una que, además de
                     * hacer las mismas funciones que la anterior, mande un mensaje al parent
                     * avisando del cambio de página
                     */
                    let oldUpdate = window.updatePage;
    
                    function getText(){
                        const pageBoxes = document.querySelectorAll('.page');
                        const inlineBlockTextBoxContents = [];
    
                        pageBoxes.forEach((textBox) => {
                            const boxContent = [];
                            if (textBox.style.display === "inline-block") {
                                const divs = textBox.querySelectorAll('.textBox');
                                const divBoxes = []
                                divs.forEach((div) => {
                                    const paragraphs = div.querySelectorAll('p');
                                    const paragraphContent = [];
                                    paragraphs.forEach((paragraph) => {
                                        paragraphContent.push(paragraph.textContent);
                                    })
                                    divBoxes.push(paragraphContent);
                                })
                                boxContent.push(divBoxes);
                            }
                            if (boxContent.length > 0) {
                                inlineBlockTextBoxContents.push(boxContent);
                            }
                        })
    
                        window.parent.postMessage({action:"text",value:inlineBlockTextBoxContents},"*");
                    }
    
                    function getBackgroundImage(page) {
                        const pageContainer = page?.querySelector('.pageContainer');
                        return pageContainer?.style?.backgroundImage
                          ?.slice(4, -1)
                          .replace(/['"]/g, '');
                      }
    
                    const preload = document.getElementById('preload-image');
    
                    function preloadImage() {
                        let preloadContent = '';
                  
                        for (let i = 0; i < 5; i++) {
                          const page = getPage(state.page_idx + i);
                          const backgroundImageUrl = getBackgroundImage(page);
                  
                          if (backgroundImageUrl) {
                            preloadContent += "url("+backgroundImageUrl+") ";
                          }
                        }
                        preload.style.content = preloadContent;
                      }
    
                    window.updatePage = function(new_page_idx){
                        oldUpdate(new_page_idx);
                        preloadImage();
                        getText();
                        window.parent.postMessage({action:"newPage",value:new_page_idx},"*");
                    }
                })()
                `;
}
