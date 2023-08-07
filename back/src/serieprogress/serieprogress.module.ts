import {Module} from "@nestjs/common";
import {SerieprogressService} from "./serieprogress.service";
import {MongooseModule} from "@nestjs/mongoose";
import {SerieProgress, SerieProgressSchema} from "./schemas/serieprogress.schema";
import {SerieProgressController} from "./serieprogress.controller";

@Module({
    imports:[MongooseModule.forFeature([
        {name: SerieProgress.name, schema: SerieProgressSchema}
    ])],
    controllers:[SerieProgressController],
    providers: [SerieprogressService],
    exports:[SerieprogressService]
})
export class SerieprogressModule {}
