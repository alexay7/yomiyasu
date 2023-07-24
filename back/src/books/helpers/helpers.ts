import * as fs from "fs";
import {dirname, join} from "path";

function extractFirstFileNameFromFolder(folderPath: string): string | null {
    const files = fs.readdirSync(folderPath);

    if (files.length > 0) {
        const firstFileName = files[0];
        return firstFileName;
    }

    return null; // Return null if no files found
}

function countFilesInFolder(folderPath: string): number {
    const files = fs.readdirSync(folderPath);
    return files.length;
}

export function extractUrlFromHtml(
    bookPath: string
): {folderName: string; thumbnailPath: string; totalImages: number} | null {
    const htmlContent = fs.readFileSync(bookPath, "utf8");
    const urlRegex = /url\("([^/]+)\/[^/]+\.[a-z]+\"\)/i;
    const match = htmlContent.match(urlRegex);

    if (match && match[1]) {
        const imagesName = match[1];
        const imagesPath = join(dirname(bookPath), imagesName);
        const firstImage = extractFirstFileNameFromFolder(imagesPath);
        const totalImages = countFilesInFolder(imagesPath);

        if (!firstImage) return null;

        return {
            folderName: imagesName,
            thumbnailPath: firstImage,
            totalImages
        };
    }

    return null; // Return null if no match found
}
