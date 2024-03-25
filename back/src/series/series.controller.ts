import {Controller, Get, Req, HttpStatus, Query, UseGuards, UnauthorizedException, Param, NotFoundException, Patch, Body, Inject, UseInterceptors, BadRequestException, Res, StreamableFile, InternalServerErrorException} from "@nestjs/common";
import {SeriesService} from "./series.service";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {SeriesSearch, UpdateSerie} from "./interfaces/query";
import {BooksService} from "../books/books.service";
import {Request, Response} from "express";
import {Types} from "mongoose";
import {SerieWithProgress} from "./interfaces/serieWithProgress";
import {ParseObjectIdPipe} from "../validation/objectId";
import {UpdateSeriesDto} from "./dto/update-series.dto";
import {WebsocketsGateway} from "../websockets/websockets.gateway";
import {UsersService} from "../users/users.service";
import {ReadlistService} from "../readlist/readlist.service";
import {CacheTTL, CACHE_MANAGER, CacheInterceptor} from "@nestjs/cache-manager";
import {Cache} from "cache-manager";
import {SerieprogressService} from "../serieprogress/serieprogress.service";
import * as path from "path";
import * as archiver from "archiver";
import * as fs from "fs-extra";

@Controller("series")
@UseGuards(JwtAuthGuard)
@ApiTags("Series")
export class SeriesController {
    constructor(
        private readonly seriesService: SeriesService,
        private readonly booksService:BooksService,
        private readonly websocketsGateway:WebsocketsGateway,
        private readonly usersService:UsersService,
        private readonly readListsService:ReadlistService,
        private readonly serieProgressService:SerieprogressService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
    ) {}

    @Get("genresAndArtists")
    @ApiOkResponse({status:HttpStatus.OK})
    @UseInterceptors(CacheInterceptor)
    async getGenresAndArtists() {
        return this.seriesService.getArtistsAndGenres();
    }

    @Get(":variant")
    @ApiOkResponse({status:HttpStatus.OK})
    @CacheTTL(60)
    async filterSeries(@Req() req:Request, @Query() query:SeriesSearch, @Param("variant") variant:"manga" | "novela" | "all") {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const cached = await this.cacheManager.get(`${userId}-${req.url}`);

        if (cached) {
            return cached;
        }

        if (!query.page || query.page < 1) {
            query.page = 1;
        }

        if (!query.limit || query.limit < 1) {
            query.limit = 25;
        }

        const foundSeries = await this.seriesService.filterSeries(userId, variant, query);

        let seriesWithProgress = [];
        let skip = 0;
        let pages = foundSeries.pages;

        if (query.readprogress || query.readlist) {
            skip = (query.page - 1) * query.limit;
        }

        for (const serie of foundSeries.data) {

            const serieBooks = await this.booksService.getSerieBooks(serie._id);

            if (serieBooks.length > 0) {

                const serieData = this.serieProgressService.getSerieProgress(serie, serieBooks);
                const readlist = serie.seriereadlist;

                if (serieData) {
                    const serieWithProgress:SerieWithProgress = {
                        ...serie,
                        readlist,
                        ...serieData
                    };
                
                    if ((query.readlist && readlist) || 
                        (query.readprogress === "completed" && serieData.unreadBooks === 0) ||
                        (query.readprogress === "reading" && ((serieData.unreadBooks !== serieWithProgress.bookCount) && (serieData.unreadBooks && serieData.unreadBooks > 0))) ||
                        (query.readprogress === "unread" && serieData.unreadBooks === serieWithProgress.bookCount) ||
                        (!query.readlist && !query.readprogress)) {
                        seriesWithProgress.push(serieWithProgress);
                    }
                }
            }
        }

        if (query.readprogress || query.readlist) {
            pages = Math.ceil(seriesWithProgress.length / query.limit);
            seriesWithProgress = seriesWithProgress.slice(skip, skip + query.limit);
        }

        const response = {data:seriesWithProgress, pages};

        await this.cacheManager.set(`${userId}-${req.url}`, response);

        return response;
    }

    @Get(":variant/random")
    async getRandomSerie(@Req() req:Request, @Query() query:SeriesSearch, @Param("variant") variant:"manga" | "novela") {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const foundSeries = await this.seriesService.filterSeries(userId, variant, query);

        const promises = foundSeries.data.map(async(serieElem)=>{
            const serieBooks = await this.booksService.getSerieBooks(serieElem._id);
            if (serieBooks.length === 0) return null;
            const serieData = this.serieProgressService.getSerieProgress(serieElem, serieBooks);
            const readlist = await this.readListsService.isInReadlist(userId, serieElem._id);

            if (serieData) {
                const serieWithProgress:SerieWithProgress = {
                    ...serieElem,
                    readlist,
                    ...serieData
                };
                
                return serieWithProgress;
            }

            return null;
        });

        let seriesWithProgress = await Promise.all(promises);

        if (seriesWithProgress.length > 0) {
            seriesWithProgress = seriesWithProgress.filter(x=>x !== null);

            if (query.readlist !== undefined) {
                seriesWithProgress = seriesWithProgress.filter(x=>x?.readlist === true);
            }
            switch (query.readprogress) {
            case "completed": {
                seriesWithProgress = seriesWithProgress.filter(x=>x?.unreadBooks === 0);
                break;
            }
            case "reading":{
                seriesWithProgress = seriesWithProgress.filter(x=>x?.unreadBooks !== x?.bookCount && x?.unreadBooks && x.unreadBooks > 0);
                break;
            }
            case "unread":{
                seriesWithProgress = seriesWithProgress.filter(x=>x?.unreadBooks === x?.bookCount);
                break;
            }
            default:{
                break;
            }
            }
        }

        const response = seriesWithProgress[Math.floor(Math.random() * seriesWithProgress.length)];

        if (!response) throw new BadRequestException();

        return response;
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

    @Get(":variant/alphabet")
    @ApiOkResponse({status:HttpStatus.OK})
    @UseInterceptors(CacheInterceptor)
    async getAlphabetGroups(@Query() query:SeriesSearch, @Param("variant") variant:"manga" | "novela") {
        const filledLetters = await this.seriesService.getAlphabetCount(variant, query);
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
            const index = alphabet.findIndex(item => item.group === result.group.toLowerCase());
            if (index !== -1) {
                alphabet[0].count += result.count;
                alphabet[index].count = result.count;
            }
        }

        return alphabet;
    }

    @Get(":variant/readlist")
    async getReadlistSeries(@Req() req:Request, @Param("variant") variant:"manga" | "novela") {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const cached = await this.cacheManager.get(`${userId}-${req.url}`);
        if (cached) {
            return cached;
        }

        const foundSeries = await this.readListsService.getUserReadListSeries(userId, variant);

        const promises = foundSeries.map(async(serieElem) => {
            const serieData = await this.booksService.getSerieStats(userId, serieElem._id, variant);
            const readlist = await this.readListsService.isInReadlist(userId, serieElem._id);
        
            if (serieData) {
                const serieWithProgress: SerieWithProgress = {
                    ...serieElem,
                    readlist,
                    ...serieData
                };
        
                return serieWithProgress;
            }
        
            // Si serieData no existe, devolvemos null para mantener el orden correcto en el array final.
            return null;
        });
        
        // Esperamos a que todas las promesas se resuelvan.
        const seriesWithProgress = await Promise.all(promises);
        
        // Filtramos los valores nulos que se devolvieron en el caso de serieData no exista.
        const response =  seriesWithProgress.filter((item) => item !== null);
        
        await this.cacheManager.set(`${userId}-${req.url}`, response);

        return response;
    }

    @Patch(":id/defaultname")
    async changeAllBooksName(@Req() req:Request, @Param("id", ParseObjectIdPipe) id:Types.ObjectId) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        const serieBooks = await this.booksService.getSerieBooks(id);

        serieBooks.forEach(async(serie)=>{
            await this.booksService.getDefaultName(serie._id, true);
        });

        return {status:"OK"};
    }

    @Get("serie/:id")
    @ApiOkResponse({status:HttpStatus.OK})
    async getSerie(@Req() req:Request, @Param("id", ParseObjectIdPipe) id:Types.ObjectId) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const cached = await this.cacheManager.get(`${userId}-${req.url}`);
        if (cached) {
            return cached;
        }

        const foundSerie = await this.seriesService.findById(id);

        if (!foundSerie) throw new NotFoundException();

        const serieData = await this.booksService.getSerieStats(userId, foundSerie._id, foundSerie.variant);
        const readlist = await this.readListsService.isInReadlist(userId, foundSerie._id);

        if (serieData) {
            const serieWithProgress:SerieWithProgress = {
                ...foundSerie,
                readlist,
                ...serieData
            };

            await this.cacheManager.set(`${userId}-${req.url}`, serieWithProgress);

            return serieWithProgress;
        }
    }

    @Get(":serieId/download")
    async downloadZip(@Res({passthrough:true}) res:Response, @Param("serieId", ParseObjectIdPipe) serie:Types.ObjectId) {
        
        const foundSerie = await this.seriesService.findById(serie);

        if (foundSerie.variant === "novela") {
            const sourceFolderPath = path.join(__dirname, "..", "..", "..", "exterior", "novelas", foundSerie.path);

            // Zip all the epub files of the serie
            const zipFileName = `${foundSerie.sortName}.zip`;
            const zipFilePath = path.join(__dirname, "..", "..", "..", "exterior", zipFileName);

            const output = fs.createWriteStream(zipFilePath);

            const archive = archiver("zip", {
                zlib: {level: 9} // Compression level (0-9)
            });

            archive.pipe(output);

            // Add all the epub files to the archive
            archive.directory(sourceFolderPath, false);

            await archive.finalize();

            res.setHeader("Content-Type", "application/zip");
            res.setHeader("Content-Disposition", `attachment; filename=${encodeURI(foundSerie.sortName)}.zip`);
            const readStream = fs.createReadStream(zipFilePath);

            return new StreamableFile(readStream);
        }

        const sourceFolderPath = path.join(__dirname, "..", "..", "..", "exterior", "mangas", foundSerie.path);

        try {
        // Crear un archivo ZIP
            const folderPath = sourceFolderPath;
            const zipFileName = `${foundSerie.sortName}.zip`;
            const zipFilePath = path.join(__dirname, "..", "..", "..", "exterior", zipFileName);
  
            // Create a write stream to the zip file
            const output = fs.createWriteStream(zipFilePath);
  
            // Create a new archiver instance
            const archive = archiver("zip", {
                zlib: {level: 9} // Compression level (0-9)
            });
  
            // Pipe the archive to the output stream
            archive.pipe(output);
  
            // Add the entire folder to the archive
            archive.directory(folderPath, false);
  
            // Finalize the archive
            await archive.finalize();
  
            // Send the file to the client
            res.setHeader("Content-Type", "application/zip");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${zipFileName}`
            );
            const readStream = fs.createReadStream(zipFilePath);
    
            return new StreamableFile(readStream);
        } catch (error) {
            console.error("Error al crear y enviar el archivo ZIP:", error);
            throw new InternalServerErrorException();
        }
    }
}
