import {Process, Processor} from "@nestjs/bull";
import {Injectable} from "@nestjs/common";
import {Job} from "bull";
import {BooksOcrService} from "../books/ocr.service";

@Injectable()
@Processor("ocr-book")
export class OcrWorker {
    constructor(private readonly booksOcrService: BooksOcrService) {}

    @Process("ocr")
    async handle(job: Job<{bookId: string}>) {
        await this.booksOcrService.runOcr(job.data.bookId);
    }
}
