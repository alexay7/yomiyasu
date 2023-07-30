import {
    Controller,
    Req,
    Post,
    Get,
    Body,
    UseGuards,
    Query,
    UnauthorizedException,
    BadRequestException,
    HttpStatus
} from "@nestjs/common";
import {ReadprogressService} from "./readprogress.service";
import {ProgressDto} from "./dto/create-readprogress.dto";
import {Request} from "express";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {Types} from "mongoose";
import {
    CreateReadProgress
} from "./interfaces/readprogress.interface";
import {ReadlistService} from "../readlist/readlist.service";
import {ReadProgress, ReadProgressStatus} from "./schemas/readprogress.schema";
import {BooksService} from "../books/books.service";
import {ParseObjectIdPipe} from "../validation/objectId";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";

@Controller("readprogress")
@ApiTags("Progresos de Lectura")
@UseGuards(JwtAuthGuard)
export class ReadprogressController {
    constructor(
        private readonly readprogressService: ReadprogressService,
        private readonly readListService: ReadlistService,
        private readonly booksService:BooksService
    ) {}

    @Post()
    @ApiOkResponse({status:HttpStatus.OK})
    async modifyOrCreateProgress(@Req() req:Request, @Body() progressDto:ProgressDto):Promise<ReadProgress | null> {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};

        const foundProgress = await this.readprogressService.findProgressByBookAndUser(progressDto.book, userId);

        const foundBook = await this.booksService.findById(progressDto.book);

        if (!foundBook) throw new BadRequestException();

        if (progressDto.status !== "unread") {
            // Si el progreso es avanzar la lectura, quitarlo de la lista de lectura si existe

            const foundReadList = await this.readListService.findSerieInReadList(userId, foundBook?.serie);
      
            if (foundReadList) {
                await this.readListService.removeSerieWithId(foundReadList._id);
            }
        }

        if (!foundProgress || foundProgress.status === "completed") {
            // No se ha encontrado progreso ninguno o el ultimo proceso es de completado, se crea uno nuevo

            const newProgress:CreateReadProgress = {
                user:userId,
                ...progressDto,
                serie:foundBook.serie,
                startDate:new Date(),
                lastUpdateDate:new Date()
            };

            return this.readprogressService.createReadProgress(newProgress);
        }

        // Se ha encontrado un proceso con estado de reading o unread, se actualizan los datos
        return this.readprogressService.modifyReadProgress(foundProgress._id as Types.ObjectId, {...progressDto, lastUpdateDate:new Date()});
    }

    @Get()
    @ApiOkResponse({status:HttpStatus.OK})
    async getReadProgress(@Req() req:Request, @Query("book", ParseObjectIdPipe) book:Types.ObjectId, @Query("status") status?:ReadProgressStatus) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};

        const found = await this.readprogressService.findProgressByBookAndUser(book, userId, status);

        if (found) return found;

        return {};
    }

    @Get("all")
    @ApiOkResponse({status:HttpStatus.OK})
    async getAllReadProgress(@Req() req:Request) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        return this.readprogressService.findUserProgresses(userId);
    }

    @Get("tablero")
    @ApiOkResponse({status:HttpStatus.OK})
    async getSeriesProgress(@Req() req:Request) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        const series = await this.readprogressService.getSeriesProgress(userId);

        const promises = series.map(async(serie)=>{
            const allBooks = await this.booksService.filterBooks(userId, {serie, sort:"sortName"});
            const unreadBooks = await this.booksService.filterBooks(userId, {serie, sort:"sortName", status:"unread"});

            // Si existen libros leidos en la serie pero NO libros en progreso, considerar serie para tablero
            if (unreadBooks.length > 0 && (allBooks.length !== unreadBooks.length) && !allBooks.some(x=>x.status === "reading")) {
                // Se buscan todos los libros que no hayan sido leidos por el usuario y se coge el primero no leido

                return unreadBooks[0];
            }

            return null;
        });

        const returnBooks = await Promise.all(promises);

        return returnBooks.filter((item) => item !== null);
    }
}
