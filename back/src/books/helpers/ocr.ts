import {existsSync} from "fs";
import {copyFile, mkdir} from "fs/promises";
import {tmpdir} from "os";
import {join} from "path";
import * as jpnData from "@tesseract.js-data/jpn";
import * as jpnVertData from "@tesseract.js-data/jpn_vert";
import {createWorker, PSM} from "tesseract.js";
import * as sharpModule from "sharp";
import {listImageFiles} from "./helpers";

/**
 * sharp expone la fábrica con `export =`; sin esModuleInterop TypeScript no
 * considera invocable el import de namespace (en runtime sí lo es), así que
 * se castea al tipo del propio export.
 */
const sharp = sharpModule as unknown as typeof import("sharp").default;

// Mismo criterio que getCharacterCount: kanji (U+4E00 - U+9FFF) y kana (U+3040 - U+30FF)
const JAPANESE_REGEX = /[\u3040-\u30FF\u4E00-\u9FFF]/g;

// Suficiente para que tesseract distinga kanji sin disparar el tiempo por página
const OCR_WIDTH = 1600;

/**
 * Los paquetes @tesseract.js-data/* traen cada traineddata en su propia
 * carpeta y createWorker solo acepta un langPath, así que se copian una vez
 * (jpn + jpn_vert) a una carpeta temporal común.
 */
async function ensureTessdataDir(): Promise<string> {
    const dir = join(tmpdir(), "yomiyasu-tessdata");

    await mkdir(dir, {recursive: true});

    for (const data of [jpnData, jpnVertData]) {
        const source = join(data.langPath, `${data.code}.traineddata.gz`);
        const target = join(dir, `${data.code}.traineddata.gz`);

        if (existsSync(source) && !existsSync(target)) {
            await copyFile(source, target);
        }
    }

    return dir;
}

/**
 * OCR sencillo de un tomo de imágenes: cuenta los caracteres japoneses de
 * cada página. `pageChars` es acumulativo, igual que en los tomos de mokuro,
 * para que el lector y las estadísticas del front funcionen sin cambios.
 */
export async function ocrCharacterCount(
    imagesFolder: string,
    onProgress?: (done: number, total: number, pageChars: number[]) => void
): Promise<{total: number; pages: number[]}> {
    const files = await listImageFiles(imagesFolder);

    if (!files.length) throw new Error(`No hay imágenes en ${imagesFolder}`);

    const langPath = await ensureTessdataDir();

    const worker = await createWorker(["jpn", "jpn_vert"], undefined, {
        langPath,
        gzip: true,
        cacheMethod: "none"
    });

    await worker.setParameters({tessedit_pageseg_mode: PSM.SPARSE_TEXT});

    const pageChars: number[] = [];
    let total = 0;

    try {
        for (const [index, file] of files.entries()) {
            try {
                const buffer = await sharp(join(imagesFolder, file))
                    .rotate()
                    .resize({width: OCR_WIDTH, withoutEnlargement: true})
                    .grayscale()
                    .normalize()
                    .jpeg({quality: 90})
                    .toBuffer();

                const {data} = await worker.recognize(buffer);
                const matches = data.text.match(JAPANESE_REGEX);

                total += matches ? matches.length : 0;
            } catch (error) {
                // Una página ilegible no debe tirar el OCR de todo el tomo
                console.error(`OCR: no se pudo procesar ${file}`, error);
            }

            pageChars.push(total);
            onProgress?.(index + 1, files.length, pageChars);
        }
    } finally {
        await worker.terminate();
    }

    return {total, pages: pageChars};
}
