import {promises as fs} from "fs";
import {dirname, join} from "path";
import {load} from "cheerio";

async function extractFirstFileNameFromFolder(folderPath: string): Promise<string | null> {
    try {
        const files = await fs.readdir(folderPath);

        if (files.length > 0) {
            // Find the first file that is a .jpg, .png or .jpeg
            const firstFileName = files.find((file) => {
                return file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg");
            });

            if (!firstFileName) return null;

            if (!firstFileName.endsWith(".jpg") && !firstFileName.endsWith(".png") && !firstFileName.endsWith(".jpeg")) return null;
            return firstFileName;
        }

        return null; // Return null if no files found
    } catch {
        console.error("Directory " + folderPath + " does not exist");
        return null;
    }
}

async function countFilesInFolder(folderPath: string): Promise<number> {
    const files = await fs.readdir(folderPath);
    return files.length;
}

export async function getCharacterCount(bookPath:string, applyBorders?:boolean):Promise<{total:number, pages:number[]}> {
    const htmlContent = await fs.readFile(bookPath, "utf8");

    const japaneseRegex = /[\u3040-\u30FF\u4E00-\u9FFF]/g; // Expresión regular para kanji (U+4E00 - U+9FFF) y kana (U+3040 - U+30FF)
    const $ = load(htmlContent);

    let japaneseCharacterCount = 0;

    const pageChars:number[] = [];

    // Recorrer todas las páginas
    $("div.page").each((pageI, pageEl)=>{
        // Buscar todos los elementos <div> con clase "textBox"
        $(pageEl).find("div.textBox").each((index, element) => {
            const pageWidth = $(element).parent().css("width");
            const pageHeight = $(element).parent().css("height");
            let minLeft = 0;
            let maxLeft = parseInt(pageWidth || "0");
            let minTop = 0;

            if (pageWidth && pageHeight) {
                minLeft = parseInt(pageWidth) * 0.12;
                maxLeft = parseInt(pageWidth) * 0.85;
                minTop = parseInt(pageHeight) * 0.05;
            }

            const horizPos = parseInt($(element).css("left") || "0");
            const verticPos = parseInt($(element).css("top") || "0");

            if ((horizPos > minLeft && horizPos < maxLeft && verticPos > minTop) || !applyBorders) {
            // Dentro de cada div.textBox, buscar todos los elementos <p>
                $(element).find("p").each((i, pElement) => {
                // Obtener el texto de cada elemento <p>
                    const text = $(pElement).text();
  
                    // Usar expresión regular para filtrar solo los caracteres japoneses
                    const japaneseCharacters = text.match(japaneseRegex);
  
                    // Sumar la cantidad de caracteres japoneses encontrados
                    if (japaneseCharacters) {
                        japaneseCharacterCount += japaneseCharacters.length;
                    }
                });
            }
        });
        pageChars.push(japaneseCharacterCount);
    });

    return {total:Math.floor(japaneseCharacterCount), pages:pageChars};
}

export async function extractUrlFromHtml(
    bookPath: string
): Promise<{folderName: string; thumbnailPath: string; totalImages: number} | null> {
    const htmlContent = await fs.readFile(bookPath, "utf8");
    const urlRegex = /url\(&quot;(.*?)&quot;\)/i;
    let match = htmlContent.match(urlRegex);

    if (!match) {
        const urlRegexDecoded = /url\("(.*?)"\)/i;
        match = htmlContent.match(urlRegexDecoded);
    }

    if (match && match[1]) {
        const imagesName = decodeURI(match[1].split("/")[0]);
        const imagesPath = join(dirname(bookPath), imagesName);
        const firstImage = await extractFirstFileNameFromFolder(imagesPath);
        if (!firstImage) return null;
        
        const totalImages = await countFilesInFolder(imagesPath);

        if (!totalImages) return null;

        return {
            folderName: imagesName,
            thumbnailPath: firstImage,
            totalImages
        };
    }

    return null; // Return null if no match found
}
