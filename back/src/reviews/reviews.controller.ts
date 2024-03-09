import {Controller, Post, Body, Req, UseGuards, UnauthorizedException, Param, Delete, BadRequestException, NotFoundException} from "@nestjs/common";
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

        const response = await this.reviewsService.create(newReview);

        if (!response) throw new BadRequestException();

        const difficulty = await this.reviewsService.getSerieDifficulty(createReviewDto.serie);

        const valoration = await this.reviewsService.getSerieValoration(createReviewDto.serie);

        await this.seriesService.editSerie(createReviewDto.serie, {difficulty, valoration});

        return response;
    }

    @Delete(":id")
    async delete(@Req() req:Request, @Param("id", ParseObjectIdPipe) reviewId:Types.ObjectId) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const foundReview = await this.reviewsService.findById(reviewId);

        if (!foundReview) throw new NotFoundException();

        const response = await this.reviewsService.removeReview(userId, reviewId);

        if (!response || ! foundReview) throw new BadRequestException();

        const difficulty = await this.reviewsService.getSerieDifficulty(foundReview.serie);

        const valoration = await this.reviewsService.getSerieValoration(foundReview.serie);

        await this.seriesService.editSerie(foundReview.serie, {difficulty:difficulty || 0, valoration:valoration || 0});

        return response;
    }
}
