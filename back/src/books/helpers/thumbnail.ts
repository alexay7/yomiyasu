import {existsSync} from "fs";
import {promises as fs} from "fs";
import {dirname, extname, join} from "path";
import * as sharpModule from "sharp";

/**
 * sharp expone la fábrica con `export =`; sin esModuleInterop TypeScript no
 * considera invocable el import de namespace (en runtime sí lo es), así que
 * se castea al tipo del propio export.
 */
const sharp = sharpModule as unknown as typeof import("sharp").default;

/**
 * Las miniaturas se guardan en un árbol paralelo dentro de exterior/ para no
 * interferir con el escaneo de la biblioteca (los contadores de páginas de
 * mokuro listan el contenido de las carpetas de imágenes).
 */
export const THUMBNAILS_FOLDER = "thumbnails";
export const THUMBNAIL_WIDTH = 480;
export const THUMBNAIL_QUALITY = 80;

export type ThumbnailResult = "created" | "skipped" | "missing" | "failed";

/** Ruta relativa a exterior/ de la miniatura correspondiente a una portada. */
export function thumbnailRelativePath(sourceRelativePath: string): string {
    const extension = extname(sourceRelativePath);
    const withoutExtension = extension
        ? sourceRelativePath.slice(0, -extension.length)
        : sourceRelativePath;

    return join(THUMBNAILS_FOLDER, `${withoutExtension}.webp`);
}

/**
 * Genera la miniatura de una portada si no existe o si la original es más
 * reciente. Es idempotente y está pensada para ejecutarse en cada rescan.
 */
export async function ensureThumbnail(
    exteriorRoot: string,
    sourceRelativePath: string
): Promise<ThumbnailResult> {
    const sourcePath = join(exteriorRoot, sourceRelativePath);
    const targetPath = join(exteriorRoot, thumbnailRelativePath(sourceRelativePath));

    if (!existsSync(sourcePath)) return "missing";

    if (existsSync(targetPath)) {
        const [sourceStat, targetStat] = await Promise.all([
            fs.stat(sourcePath),
            fs.stat(targetPath)
        ]);

        if (targetStat.mtimeMs >= sourceStat.mtimeMs) return "skipped";
    }

    try {
        await fs.mkdir(dirname(targetPath), {recursive: true});

        await sharp(sourcePath)
            .rotate()
            .resize({width: THUMBNAIL_WIDTH, withoutEnlargement: true})
            .webp({quality: THUMBNAIL_QUALITY})
            .toFile(targetPath);

        return "created";
    } catch (e) {
        console.error(`No se pudo generar la miniatura de ${sourceRelativePath}`, e);
        return "failed";
    }
}

/** Genera varias miniaturas con un número limitado de tareas en paralelo. */
export async function ensureThumbnails(
    exteriorRoot: string,
    sourcePaths: string[],
    concurrency = 4
): Promise<Record<ThumbnailResult, number>> {
    const counters: Record<ThumbnailResult, number> = {
        created: 0,
        skipped: 0,
        missing: 0,
        failed: 0
    };

    let next = 0;

    const worker = async () => {
        while (next < sourcePaths.length) {
            const sourceRelativePath = sourcePaths[next++];
            counters[await ensureThumbnail(exteriorRoot, sourceRelativePath)]++;
        }
    };

    await Promise.all(
        Array.from({length: Math.min(concurrency, sourcePaths.length)}, worker)
    );

    return counters;
}
