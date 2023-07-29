import {Module} from "@nestjs/common";
import {SeriesService} from "./series.service";
import {SeriesController} from "./series.controller";
import {MongooseModule} from "@nestjs/mongoose";
import {Serie, SerieSchema} from "./schemas/series.schema";
import {BooksModule} from "../books/books.module";
import {ReadlistModule} from "../readlist/readlist.module";

@Module({
    imports: [
        MongooseModule.forFeature([{name: Serie.name, schema: SerieSchema}]),
        BooksModule,
        ReadlistModule
    ],
    controllers: [SeriesController],
    providers: [SeriesService],
    exports: [SeriesService]
})
export class SeriesModule {}
