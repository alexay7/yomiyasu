import {Injectable, Logger} from "@nestjs/common";
import {Types} from "mongoose";
import {join} from "path";
import {BooksService} from "./books.service";
import {WebsocketsGateway} from "../websockets/websockets.gateway";
import {ocrCharacterCount} from "./helpers/ocr";

/**
 * OCR de caracteres para tomos de imágenes sin mokuro. Se ejecuta en la cola
 * "ocr-book" porque puede tardar minutos: no debe bloquear peticiones ni el
 * rescan de la biblioteca.
 */
@Injectable()
export class BooksOcrService {
    private readonly logger = new Logger(BooksOcrService.name);

    constructor(
        private readonly booksService: BooksService,
        private readonly websocketsGateway: WebsocketsGateway
    ) {}

    async runOcr(bookId: string): Promise<void> {
        const id = new Types.ObjectId(bookId);
        const book = await this.booksService.findById(id);

        if (!book) {
            this.logger.warn(`OCR cancelado: no existe el libro ${bookId}`);
            return;
        }

        // Si el tomo ha dejado de ser de imágenes (le apareció un mokuro) o no
        // es un manga, no hay nada que hacer
        if (book.format !== "images" || book.variant !== "manga") {
            await this.booksService.editBook(id, {ocrStatus: null, ocrProgress: 0});
            this.logger.warn(`OCR cancelado: ${bookId} ya no es un tomo de imágenes`);
            return;
        }

        const folder = join(
            process.cwd(),
            "..",
            "exterior",
            "mangas",
            book.seriePath,
            book.imagesFolder
        );

        this.logger.log(`Iniciando OCR de ${book.visibleName} (${folder})`);

        try {
            const {total, pages} = await ocrCharacterCount(folder, (done, totalPages) => {
                const progress = Math.min(99, Math.floor((done / totalPages) * 100));

                // No escribir en Mongo ni avisar en cada página de un tomo largo
                const updateEvery = Math.max(1, Math.floor(totalPages / 20));

                if (done % updateEvery === 0 || done === totalPages) {
                    this.booksService.editBook(id, {ocrProgress: progress}).catch((error) => {
                        this.logger.warn(`No se pudo guardar el progreso del OCR: ${String(error)}`);
                    });

                    this.websocketsGateway.sendNotificationToClient({
                        action: "BOOK_OCR_PROGRESS",
                        bookId,
                        progress
                    });
                }
            });

            await this.booksService.editBook(id, {
                characters: total,
                pageChars: pages,
                ocrStatus: "done",
                ocrProgress: 100,
                lastModifiedDate: new Date()
            });

            this.logger.log(`OCR terminado de ${book.visibleName}: ${total} caracteres en ${pages.length} páginas`);
        } catch (error) {
            await this.booksService.editBook(id, {ocrStatus: "error", ocrProgress: 0});
            this.logger.error(`OCR falló para ${book.visibleName}`, error instanceof Error ? error.stack : String(error));
            this.websocketsGateway.sendNotificationToClient({action: "LIBRARY_UPDATE"});
            throw error;
        }

        this.websocketsGateway.sendNotificationToClient({action: "LIBRARY_UPDATE"});
    }
}
