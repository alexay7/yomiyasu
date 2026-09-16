import {createReadStream} from "fs";
import {promises as fs} from "fs";
import {isAbsolute, relative, resolve, sep} from "path";
import type {Response} from "express";
import * as archiver from "archiver";

/**
 * Nivel de compresión de los zips de descarga. Las imágenes de mokuro
 * (JPEG/PNG) y los EPUB ya están comprimidos, así que un nivel alto solo
 * consume CPU sin apenas reducir el tamaño; el nivel 1 es casi tan rápido
 * como almacenar sin comprimir y sí comprime algo los archivos de texto.
 */
export const ZIP_COMPRESSION_LEVEL = 1;

/** Entrada que se añade a un zip de descarga. */
export type ZipSource =
    | {
        kind: "directory";
        path: string;
        /** Nombre dentro del zip; si falta, las entradas van a la raíz. */
        name?: string;
        /** Devuelve false para omitir la entrada. */
        filter?: (entry: archiver.EntryData) => boolean;
    }
    | {kind: "file"; path: string; name: string};

/**
 * Resuelve una ruta dentro de `root` y rechaza cualquier intento de salir de
 * ella (rutas relativas con `..`, rutas absolutas o que resuelvan al propio
 * root). Evita que valores editables de la base de datos (nombres de serie,
 * `sortName`, etc.) escapen de la biblioteca.
 */
export function resolveInside(root: string, ...segments: string[]): string {
    const resolvedRoot = resolve(root);
    const target = resolve(resolvedRoot, ...segments);
    const relativePath = relative(resolvedRoot, target);

    if (
        relativePath === "" ||
        relativePath === ".." ||
        relativePath.startsWith(`..${sep}`) ||
        isAbsolute(relativePath)
    ) {
        throw new Error(`Ruta fuera de la biblioteca: ${[root, ...segments].join("/")}`);
    }

    return target;
}

const FORBIDDEN_NAME_CHARACTERS = new Set(["\"", "/", "\\", ":", "*", "?", "<", ">", "|"]);

/**
 * Limpia un nombre de descarga para que nunca pueda inyectar cabeceras
 * (comillas, saltos de línea) ni rutas (separadores) en el cliente.
 */
export function sanitizeDownloadName(downloadName: string): string {
    let cleaned = "";

    for (const char of downloadName) {
        const code = char.charCodeAt(0);
        const isControl = code < 0x20 || code === 0x7f;

        cleaned += isControl || FORBIDDEN_NAME_CHARACTERS.has(char) ? "_" : char;
    }

    cleaned = cleaned.trim();

    return cleaned.length > 0 ? cleaned : "download";
}

function encodeRfc5987(value: string): string {
    return encodeURIComponent(value).replace(
        /[!'()*]/g,
        (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
    );
}

/**
 * Cabecera `Content-Disposition` con nombre UTF-8 (RFC 5987) y respaldo
 * ASCII para clientes antiguos.
 */
export function contentDisposition(downloadName: string): string {
    const safeName = sanitizeDownloadName(downloadName);
    const asciiFallback = safeName.replace(/[^\x20-\x7e]/g, "_");

    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeRfc5987(safeName)}`;
}

/** Fija las cabeceras comunes de una descarga. */
export function setDownloadHeaders(
    res: Response,
    contentType: string,
    downloadName: string,
    contentLength?: number
): void {
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", contentDisposition(downloadName));
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (contentLength !== undefined) {
        res.setHeader("Content-Length", contentLength);
    }
}

/** Filtro de zips de series de novelas: solo los .epub. */
export function novelZipFilter(entry: archiver.EntryData): boolean {
    if (entry.stats?.isDirectory()) return true;

    return entry.name.toLowerCase().endsWith(".epub");
}

/** Filtro de zips de series de manga: fuera los .cbz/.zip pre-generados. */
export function mangaZipFilter(entry: archiver.EntryData): boolean {
    if (entry.stats?.isDirectory()) return true;

    return !/\.(cbz|zip)$/i.test(entry.name);
}

/**
 * Envía un zip construido al vuelo directamente a la respuesta, sin archivo
 * temporal intermedio: el cliente empieza a recibir datos mientras se
 * comprime y dos descargas concurrentes no compiten por ningún archivo.
 *
 * Si algo falla con las cabeceras ya enviadas se corta la conexión para que
 * el cliente detecte la descarga rota; si el cliente aborta, se cancela el
 * archiver para no seguir leyendo del disco.
 */
export async function streamZipToResponse(
    res: Response,
    sources: ZipSource[],
    downloadName: string
): Promise<void> {
    setDownloadHeaders(res, "application/zip", downloadName);

    const archive = archiver("zip", {zlib: {level: ZIP_COMPRESSION_LEVEL}});

    await new Promise<void>((resolvePromise) => {
        let settled = false;

        const settle = (error?: Error) => {
            if (settled) return;
            settled = true;

            if (error) {
                console.error(`Descarga zip interrumpida: ${downloadName}`, error);
            }

            resolvePromise();
        };

        archive.on("warning", (error) => {
            // Un ENOENT puntual solo omite esa entrada; el zip sigue siendo válido.
            if (error.code !== "ENOENT") settle(error);
        });

        archive.on("error", (error) => {
            if (!res.writableEnded) res.destroy(error);
            settle(error);
        });

        res.on("error", (error) => settle(error));

        res.on("close", () => {
            if (!res.writableEnded) archive.abort();
            settle();
        });

        archive.pipe(res);

        for (const source of sources) {
            if (source.kind === "file") {
                archive.file(source.path, {name: source.name});
                continue;
            }

            const filter = source.filter;
            const destPath = source.name ?? false;

            if (filter) {
                archive.directory(source.path, destPath, (entry) =>
                    filter(entry) ? entry : false
                );
            } else {
                archive.directory(source.path, destPath);
            }
        }

        archive.finalize().then(
            () => settle(),
            (error) => settle(error)
        );
    });
}

/**
 * Envía un archivo de la biblioteca a la respuesta con `Content-Length`
 * (para que el cliente pueda mostrar progreso) y cancelando la lectura si el
 * cliente aborta.
 */
export async function streamFileToResponse(
    res: Response,
    filePath: string,
    contentType: string,
    downloadName: string
): Promise<void> {
    const stats = await fs.stat(filePath);

    setDownloadHeaders(res, contentType, downloadName, stats.size);

    const readStream = createReadStream(filePath);

    await new Promise<void>((resolvePromise) => {
        let settled = false;

        const settle = () => {
            if (settled) return;
            settled = true;
            resolvePromise();
        };

        readStream.on("error", (error) => {
            if (!res.writableEnded) res.destroy(error);
            settle();
        });

        res.on("close", () => {
            if (!res.writableEnded) readStream.destroy();
            settle();
        });

        readStream.pipe(res);
    });
}
