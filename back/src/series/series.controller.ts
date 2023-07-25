import {Controller, Get, Req, HttpStatus, Query, UseGuards, UnauthorizedException} from "@nestjs/common";
import {SeriesService} from "./series.service";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {SeriesSearch} from "./interfaces/query";
import {BooksService} from "../books/books.service";
import {Request} from "express";
import {Types} from "mongoose";
import {SerieWithProgress} from "./interfaces/serieWithProgress";

@Controller("series")
@UseGuards(JwtAuthGuard)
@ApiTags("Series")
export class SeriesController {
    constructor(
        private readonly seriesService: SeriesService,
        private readonly booksService:BooksService
    ) {}

    @Get()
    @ApiOkResponse({status:HttpStatus.OK})
    async filterSeries(@Req() req:Request, @Query() query:SeriesSearch) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        if (!query.page || query.page < 1) {
            query.page = 1;
        }

        if (!query.limit || query.limit < 1) {
            query.limit = 25;
        }

        const foundSeries = await this.seriesService.filterSeries(query);
        const seriesWithProgress:SerieWithProgress[] = [];

        await Promise.all(
            foundSeries.data.map(async(serieElem)=>{
                const unreadBooks = await this.booksService.filterBooks(userId, {serie:serieElem._id, sort:"sortName", status:"unread"});
                let thumbnail:string | undefined;

                if (unreadBooks.length === 0) {
                    const firstBook = await this.booksService.filterBooks(userId, {serie:serieElem._id, sort:"sortName"});
                    if (firstBook.length > 0) {
                        thumbnail = `${firstBook[0].seriePath}/${firstBook[0].path}/${firstBook[0].thumbnailPath}`;   
                    }
                } else {
                    thumbnail = `${unreadBooks[0].seriePath}/${unreadBooks[0].imagesFolder}/${unreadBooks[0].thumbnailPath}`;  
                }

                if (thumbnail) {
                    const serieWithProgress:SerieWithProgress = {
                        ...serieElem.toObject(),
                        unreadBooks:unreadBooks.length,
                        thumbnailPath:thumbnail,
                        type:"serie"
                    };
                
                    seriesWithProgress.push(serieWithProgress);
                }
            }));

        return {data:seriesWithProgress, pages:foundSeries.pages};
    }

    @Get("alphabet")
    @ApiOkResponse({status:HttpStatus.OK})
    async getAlphabetGroups(@Query() query:SeriesSearch) {
        const filledLetters = await this.seriesService.getAlphabetCount(query);
        const alphabet: {
            group: string;
            count: number;
        }[] = [{group:"all", count:0}, {group:"#", count:0}];

        // Create an object for each letter of the alphabet with count 0
        for (let i = 0; i < 26; i++) {
            const letter = String.fromCharCode(97 + i); // ASCII code for lowercase 'a' is 97
            alphabet.push({group: letter, count: 0});
        }

        // Populate the counts from the aggregation result
        for (const result of filledLetters) {
            const index = alphabet.findIndex(item => item.group === result.group);
            if (index !== -1) {
                alphabet[0].count += result.count;
                alphabet[index].count = result.count;
            }
        }

        return alphabet;
    }
}
