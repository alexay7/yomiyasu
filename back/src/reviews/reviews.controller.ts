import {Controller, Post, Body, Req, UseGuards, UnauthorizedException, Param, Delete} from "@nestjs/common";
import {ReviewsService} from "./reviews.service";
import {CreateReviewDto} from "./dto/create-review.dto";
import {Review} from "./schemas/review.schema";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {Types} from "mongoose";
import {Request} from "express";
import {SeriesService} from "../series/series.service";
import {ParseObjectIdPipe} from "../validation/objectId";

@Controller("reviews")
@UseGuards(JwtAuthGuard)
export class ReviewsController {
    constructor(
        private readonly reviewsService: ReviewsService,
        private readonly seriesService:SeriesService
    ) {}

    @Post()
    async create(@Req() req:Request, @Body() createReviewDto: CreateReviewDto) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};
        
        const newReview:Review = {
            user:userId,
            ...createReviewDto
        };

        const difficulty = await this.reviewsService.getSerieDifficulty(createReviewDto.serie);

        await this.seriesService.editSerie(createReviewDto.serie, {difficulty});

        return this.reviewsService.create(newReview);
    }

    @Delete(":id")
    async delete(@Req() req:Request, @Param("id", ParseObjectIdPipe) reviewId:Types.ObjectId) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        return this.reviewsService.removeReview(userId, reviewId);
    }
}
