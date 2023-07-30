import {Controller, Get, Req, HttpStatus, Query, UseGuards, UnauthorizedException, Param, NotFoundException, Patch, Body} from "@nestjs/common";
import {SeriesService} from "./series.service";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {SeriesSearch, UpdateSerie} from "./interfaces/query";
import {BooksService} from "../books/books.service";
import {Request} from "express";
import {Types} from "mongoose";
import {SerieWithProgress} from "./interfaces/serieWithProgress";
import {ParseObjectIdPipe} from "../validation/objectId";
import {UpdateSeriesDto} from "./dto/update-series.dto";
import {WebsocketsGateway} from "../websockets/websockets.gateway";
import {UsersService} from "../users/users.service";
import {ReadlistService} from "../readlist/readlist.service";

@Controller("series")
@UseGuards(JwtAuthGuard)
@ApiTags("Series")
export class SeriesController {
    constructor(
        private readonly seriesService: SeriesService,
        private readonly booksService:BooksService,
        private readonly websocketsGateway:WebsocketsGateway,
        private readonly usersService:UsersService,
        private readonly readListsService:ReadlistService
    ) {}

    @Get()
    @ApiOkResponse({status:HttpStatus.OK})
    async filterSeries(@Req() req:Request, @Query() query:SeriesSearch) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        let sort = query.sort || "sortName";
        let reversed = false;
        if (sort.includes("!")) {
            reversed = true;
            sort = sort.replace("!", "") as "createdDate" | "bookCount" | "lastModifiedDate" | "sortName" | "difficulty";
        }

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
                const serieData = await this.booksService.getSerieStats(userId, serieElem._id);
                const readlist = await this.readListsService.isInReadlist(userId, serieElem._id);

                if (serieData) {
                    const serieWithProgress:SerieWithProgress = {
                        ...serieElem.toObject(),
                        readlist,
                        ...serieData
                    };
                    
                    seriesWithProgress.push(serieWithProgress);
                }
            }));

        return {data:seriesWithProgress.sort((x, y)=> {
            if (x[sort] < y[sort]) {
                return reversed ? 1 : -1;
            }
            if (x[sort] > y[sort]) {
                return reversed ? -1 : 1;
            }
            return 0;
        }), pages:foundSeries.pages};
    }

    @Patch(":id")
    @ApiOkResponse({status:HttpStatus.OK})
    async updateSerie(@Req() req:Request, @Param("id", ParseObjectIdPipe) serie:Types.ObjectId, @Body() updateSerieDto:UpdateSeriesDto) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        this.websocketsGateway.sendNotificationToClient({action:"LIBRARY_UPDATE"});

        const updateSerie:UpdateSerie = {
            ...updateSerieDto,
            lastModifiedDate:new Date()
        };

        return this.seriesService.editSerie(serie, updateSerie);
    }

    @Get("genresAndArtists")
    @ApiOkResponse({status:HttpStatus.OK})
    getGenresAndArtists() {
        return this.seriesService.getArtistsAndGenres();
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

    @Get("readlist")
    async getReadlistSeries(@Req() req:Request) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const foundSeries = await this.readListsService.getUserReadListSeries(userId);

        const seriesWithProgress:SerieWithProgress[] = [];

        await Promise.all(
            foundSeries.map(async(serieElem)=>{
                const serieData = await this.booksService.getSerieStats(userId, serieElem._id);
                const readlist = await this.readListsService.isInReadlist(userId, serieElem._id);

                if (serieData) {
                    const serieWithProgress:SerieWithProgress = {
                        ...serieElem,
                        readlist,
                        ...serieData
                    };
                    
                    seriesWithProgress.push(serieWithProgress);
                }
            }));
        return seriesWithProgress;
    }

    @Get(":id")
    @ApiOkResponse({status:HttpStatus.OK})
    async getSerie(@Req() req:Request, @Param("id", ParseObjectIdPipe) id:Types.ObjectId) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const foundSerie = await this.seriesService.findById(id);

        if (!foundSerie) throw new NotFoundException();

        const serieData = await this.booksService.getSerieStats(userId, foundSerie._id);
        const readlist = await this.readListsService.isInReadlist(userId, foundSerie._id);

        if (serieData) {
            const serieWithProgress:SerieWithProgress = {
                ...foundSerie,
                readlist,
                ...serieData
            };
            return serieWithProgress;
        }
    }
}
