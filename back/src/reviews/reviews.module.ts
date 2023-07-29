import {Module} from "@nestjs/common";
import {ReviewsService} from "./reviews.service";
import {ReviewsController} from "./reviews.controller";
import {MongooseModule} from "@nestjs/mongoose";
import {Review, ReviewSchema} from "./schemas/review.schema";
import {SeriesModule} from "../series/series.module";

@Module({
    imports:[MongooseModule.forFeature([{name: Review.name, schema: ReviewSchema}]), SeriesModule],
    controllers: [ReviewsController],
    providers: [ReviewsService]
})
export class ReviewsModule {}
