import {Module} from "@nestjs/common";
import {BullModule} from "@nestjs/bull";
import {BooksService} from "./books.service";
import {BooksController} from "./books.controller";
import {BooksOcrService} from "./ocr.service";
import {OcrWorker} from "../queue/ocr-book.job";
import {MongooseModule} from "@nestjs/mongoose";
import {Book, BookSchema} from "./schemas/book.schema";

@Module({
    imports: [
        MongooseModule.forFeature([{name: Book.name, schema: BookSchema}]),
        BullModule.registerQueue({name: "ocr-book"})
    ],
    controllers: [BooksController],
    providers: [BooksService, BooksOcrService, OcrWorker],
    exports: [BooksService, BooksOcrService]
})
export class BooksModule {}
