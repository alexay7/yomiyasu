import {promises as fs} from "fs";
import type {Stats} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import {PassThrough} from "stream";
import type {Response} from "express";
import {
    contentDisposition,
    mangaZipFilter,
    novelZipFilter,
    resolveInside,
    sanitizeDownloadName,
    streamFileToResponse,
    streamZipToResponse
} from "./zipDownload";

const directoryStats = {isDirectory: () => true} as unknown as Stats;
const fileStats = {isDirectory: () => false} as unknown as Stats;

interface MockResponse {
    res: Response;
    headers: Record<string, unknown>;
    body: Promise<Buffer>;
}

/** Respuesta de express falsa que acumula cabeceras y bytes enviados. */
function createMockResponse(): MockResponse {
    const chunks: Buffer[] = [];
    const headers: Record<string, unknown> = {};
    const res = new PassThrough();

    (res as unknown as {setHeader: (name: string, value: unknown) => void}).setHeader =
        (name, value) => {
            headers[name] = value;
        };

    res.on("data", (chunk: Buffer) => chunks.push(chunk));

    const body = new Promise<Buffer>((resolve) => {
        res.on("end", () => resolve(Buffer.concat(chunks)));
    });

    return {res: res as unknown as Response, headers, body};
}

describe("sanitizeDownloadName", () => {
    it("no permite escapar rutas ni inyectar cabeceras", () => {
        expect(sanitizeDownloadName("../../etc/passwd")).toBe(".._.._etc_passwd");
        expect(sanitizeDownloadName('malo"; nombre="x')).toBe("malo_; nombre=_x");
        expect(sanitizeDownloadName("salto\r\nde línea")).toBe("salto__de línea");
    });

    it("usa un nombre por defecto si queda vacío", () => {
        expect(sanitizeDownloadName("   ")).toBe("download");
    });
});

describe("contentDisposition", () => {
    it("genera un fallback ASCII y el nombre UTF-8 (RFC 5987)", () => {
        expect(contentDisposition("My Serie.zip")).toBe(
            "attachment; filename=\"My Serie.zip\"; filename*=UTF-8''My%20Serie.zip"
        );

        expect(contentDisposition("日本語.zip")).toBe(
            "attachment; filename=\"___.zip\"; filename*=UTF-8''%E6%97%A5%E6%9C%AC%E8%AA%9E.zip"
        );
    });

    it("codifica los caracteres que encodeURIComponent deja pasar", () => {
        expect(contentDisposition("(test)*!.zip")).toContain("filename*=UTF-8''%28test%29_%21.zip");
    });

    it("nunca incluye saltos de línea", () => {
        const header = contentDisposition("serie\r\nX-Evil: 1.zip");

        expect(header).not.toMatch(/[\r\n]/);
    });
});

describe("resolveInside", () => {
    it("resuelve rutas dentro de la raíz", () => {
        expect(resolveInside("/biblioteca", "mangas", "serie", "v001")).toBe(
            "/biblioteca/mangas/serie/v001"
        );
    });

    it("rechaza rutas que se salen de la raíz", () => {
        expect(() => resolveInside("/biblioteca", "..", "etc")).toThrow();
        expect(() => resolveInside("/biblioteca", "mangas", "../../fuera")).toThrow();
        expect(() => resolveInside("/biblioteca", "/etc/passwd")).toThrow();
        expect(() => resolveInside("/biblioteca")).toThrow();
    });
});

describe("filtros de entradas de los zips", () => {
    const entry = (name: string, stats: Stats = fileStats) => ({name, stats});

    it("las novelas solo incluyen .epub", () => {
        expect(novelZipFilter(entry("v001.epub"))).toBe(true);
        expect(novelZipFilter(entry("V002.EPUB"))).toBe(true);
        expect(novelZipFilter(entry("v001.jpg"))).toBe(false);
        expect(novelZipFilter(entry("carpeta", directoryStats))).toBe(true);
    });

    it("los mangas excluyen los .cbz/.zip pre-generados", () => {
        expect(mangaZipFilter(entry("v001.html"))).toBe(true);
        expect(mangaZipFilter(entry("page1.jpg"))).toBe(true);
        expect(mangaZipFilter(entry("v001.cbz"))).toBe(false);
        expect(mangaZipFilter(entry("v001.CBZ"))).toBe(false);
        expect(mangaZipFilter(entry("v001.zip"))).toBe(false);
        expect(mangaZipFilter(entry("carpeta", directoryStats))).toBe(true);
    });
});

describe("streamZipToResponse", () => {
    let tempDirs: string[] = [];

    const createTempDir = async () => {
        const dir = await fs.mkdtemp(join(tmpdir(), "zip-download-"));
        tempDirs.push(dir);

        return dir;
    };

    afterEach(async () => {
        await Promise.all(tempDirs.map((dir) => fs.rm(dir, {recursive: true, force: true})));
        tempDirs = [];
    });

    it("envía un zip con las cabeceras correctas", async () => {
        const dir = await createTempDir();
        await fs.writeFile(join(dir, "v001.epub"), "epub");

        const {res, headers, body} = createMockResponse();
        await streamZipToResponse(res, [{kind: "directory", path: dir}], "Serie Ñ.zip");
        const buffer = await body;

        expect(headers["Content-Type"]).toBe("application/zip");
        expect(headers["Content-Disposition"]).toContain("filename*=UTF-8''Serie%20%C3%91.zip");
        expect(headers["Content-Length"]).toBeUndefined();
        expect(buffer.length).toBeGreaterThan(0);
        expect(buffer.includes(Buffer.from("v001.epub"))).toBe(true);
    });

    it("aplica el filtro de novelas y omite las portadas sueltas", async () => {
        const dir = await createTempDir();
        await fs.writeFile(join(dir, "v001.epub"), "epub");
        await fs.writeFile(join(dir, "v001.jpg"), "portada");

        const {res, body} = createMockResponse();
        await streamZipToResponse(
            res,
            [{kind: "directory", path: dir, filter: novelZipFilter}],
            "novelas.zip"
        );
        const buffer = await body;

        expect(buffer.includes(Buffer.from("v001.epub"))).toBe(true);
        expect(buffer.includes(Buffer.from("v001.jpg"))).toBe(false);
    });

    it("aplica el filtro de mangas y omite los cbz", async () => {
        const dir = await createTempDir();
        await fs.writeFile(join(dir, "v001.html"), "html");
        await fs.writeFile(join(dir, "v001.cbz"), "cbz");
        await fs.mkdir(join(dir, "v001"));
        await fs.writeFile(join(dir, "v001", "page1.jpg"), "pagina");

        const {res, body} = createMockResponse();
        await streamZipToResponse(
            res,
            [{kind: "directory", path: dir, filter: mangaZipFilter}],
            "mangas.zip"
        );
        const buffer = await body;

        expect(buffer.includes(Buffer.from("v001.html"))).toBe(true);
        expect(buffer.includes(Buffer.from("page1.jpg"))).toBe(true);
        expect(buffer.includes(Buffer.from("v001.cbz"))).toBe(false);
    });

    it("permite mezclar carpetas con nombre y archivos sueltos (volumen de manga)", async () => {
        const dir = await createTempDir();
        await fs.mkdir(join(dir, "v001"));
        await fs.writeFile(join(dir, "v001", "page1.jpg"), "pagina");
        await fs.writeFile(join(dir, "v001.html"), "html");

        const {res, body} = createMockResponse();
        await streamZipToResponse(
            res,
            [
                {kind: "directory", path: join(dir, "v001"), name: "v001"},
                {kind: "file", path: join(dir, "v001.html"), name: "v001.html"}
            ],
            "v001.zip"
        );
        const buffer = await body;

        expect(buffer.includes(Buffer.from("v001/page1.jpg"))).toBe(true);
        expect(buffer.includes(Buffer.from("v001.html"))).toBe(true);
    });
});

describe("streamFileToResponse", () => {
    let tempDirs: string[] = [];

    afterEach(async () => {
        await Promise.all(tempDirs.map((dir) => fs.rm(dir, {recursive: true, force: true})));
        tempDirs = [];
    });

    it("envía el archivo con Content-Length", async () => {
        const dir = await fs.mkdtemp(join(tmpdir(), "file-download-"));
        tempDirs.push(dir);

        const filePath = join(dir, "novela.epub");
        await fs.writeFile(filePath, "contenido epub");

        const {res, headers, body} = createMockResponse();
        await streamFileToResponse(res, filePath, "application/epub+zip", "Novela Ñ.epub");
        const buffer = await body;

        expect(headers["Content-Type"]).toBe("application/epub+zip");
        expect(headers["Content-Length"]).toBe(Buffer.byteLength("contenido epub"));
        expect(headers["Content-Disposition"]).toContain("filename*=UTF-8''Novela%20%C3%91.epub");
        expect(buffer.toString()).toBe("contenido epub");
    });
});
