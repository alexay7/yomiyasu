import {promises as fs} from "fs";
import {dirname, join} from "path";

async function extractFirstFileNameFromFolder(folderPath: string): Promise<string | null> {
    const files = await fs.readdir(folderPath);

    if (files.length > 0) {
        const firstFileName = files[0];
        return firstFileName;
    }

    return null; // Return null if no files found
}

async function countFilesInFolder(folderPath: string): Promise<number> {
    const files = await fs.readdir(folderPath);
    return files.length;
}

export async function getCharacterCount(bookPath:string):Promise<number> {
    const htmlContent = await fs.readFile(bookPath, "utf8");

    const japaneseRegex = /[\u3040-\u30FF\u4E00-\u9FFF]/g; // Expresión regular para kanji (U+4E00 - U+9FFF) y kana (U+3040 - U+30FF)
    let totalJapaneseCharacters = 0;

    // Buscar todos los elementos <div> con clase "textBox"
    const textBoxDivs = htmlContent.match(/<div[^>]*class="textBox"[^>]*>[\s\S]*?<\/div>/g) || [];

    textBoxDivs.forEach((div) => {
    // Dentro de cada div.textBox, buscar todos los elementos <p>
        const pElements = div.match(/<p[^>]*>[\s\S]*?<\/p>/g) || [];

        pElements.forEach((pElement) => {
            // Filtrar y contar caracteres japoneses en el texto de cada elemento <p>
            const text = pElement.replace(/<[^>]+>/g, ""); // Eliminar las etiquetas HTML del texto
            const japaneseCharacters = text.match(japaneseRegex) || [];
            totalJapaneseCharacters += japaneseCharacters.length;
        });
    });

    return totalJapaneseCharacters;
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
        const totalImages = await countFilesInFolder(imagesPath);

        if (!firstImage) return null;

        return {
            folderName: imagesName,
            thumbnailPath: firstImage,
            totalImages
        };
    }

    return null; // Return null if no match found
}
