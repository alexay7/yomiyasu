import {existsSync} from "fs";
import {join} from "path";
import {Response} from "express";

const THUMBNAILS_PREFIX = "/thumbnails/";
const ORIGINAL_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

/**
 * Portada original asociada a una miniatura, o null si la ruta no es una
 * miniatura o no hay ninguna portada con ese nombre.
 */
export function originalPathForThumbnail(relativePath: string, root: string): string | null {
    if (!relativePath.startsWith(THUMBNAILS_PREFIX)) return null;

    const base = relativePath.slice(THUMBNAILS_PREFIX.length).replace(/\.webp$/i, "");

    const candidates = ORIGINAL_EXTENSIONS.map((extension) => `/${base}${extension}`);

    return candidates.find((candidate) => existsSync(join(root, candidate))) ?? null;
}

/**
 * Sirve un archivo estático. Si es una miniatura que todavía no se ha
 * generado, responde con la portada original en lugar de un 404: así los
 * clientes no reciben un error (ni gastan una segunda petición) por
 * miniaturas pendientes de generar. La respuesta de respaldo va sin caché
 * para que, en cuanto el rescan genere la miniatura, se pida de nuevo.
 */
export function sendStaticFile(
    res: Response,
    root: string,
    relativePath: string,
    alreadyFellBack = false
): void {
    res.sendFile(relativePath, {root}, (err?: Error) => {
        if (!err) return;

        if (res.headersSent) {
            res.end();
            return;
        }

        const fallback = alreadyFellBack ? null : originalPathForThumbnail(relativePath, root);

        if (fallback) {
            res.setHeader("Cache-Control", "no-cache");
            sendStaticFile(res, root, fallback, true);
            return;
        }

        res.sendStatus(404);
    });
}
