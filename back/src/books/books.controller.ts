import {Controller, Get, Req, UnauthorizedException, UseGuards, Query, Param, HttpStatus, Patch, Body} from "@nestjs/common";
import {BooksService} from "./books.service";
import {Request} from "express";
import {Types} from "mongoose";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {SearchQuery, UpdateBook} from "./interfaces/query";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {ParseObjectIdPipe} from "../validation/objectId";
import {UsersService} from "../users/users.service";
import {WebsocketsGateway} from "../websockets/websockets.gateway";
import {UpdateBookDto} from "./dto/update-book.dto";

@Controller("books")
@ApiTags("Libros")
@UseGuards(JwtAuthGuard)
export class BooksController {
    constructor(
        private readonly booksService: BooksService,
        private readonly usersService:UsersService,
        private readonly websocketsGateway:WebsocketsGateway
    ) {}
  
    @Get()
    @ApiOkResponse({status:HttpStatus.OK})
    filterBooks(@Req() req:Request, @Query() query:SearchQuery) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};

        if (!query.page || query.page < 1) {
            query.page = 1;
        }

        if (!query.limit || query.limit < 1) {
            query.limit = 25;
        }

        return this.booksService.filterBooks(userId, query);
    }

    @Patch(":id")
    @ApiOkResponse({status:HttpStatus.OK})
    async updateSerie(@Req() req:Request, @Param("id", ParseObjectIdPipe) book:Types.ObjectId, @Body() updateBookDto:UpdateBookDto) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        this.websocketsGateway.sendNotificationToClient({action:"LIBRARY_UPDATE"});

        const updateBook:UpdateBook = {
            ...updateBookDto,
            lastModifiedDate:new Date()
        };

        return this.booksService.editBook(book, updateBook);
    }

    @Get("genresAndArtists")
    @ApiOkResponse({status:HttpStatus.OK})
    async getGenresAndArtists() {
        return this.booksService.getArtistsAndGenres();
    }

    @Get(":id")
    @ApiOkResponse({status:HttpStatus.OK})
    async getBook(@Param("id") book:Types.ObjectId) {
        return this.booksService.findById(book);
    }
    
    @Get(":id/defaultname")
    @ApiOkResponse({status:HttpStatus.OK})
    async getBookDefaultName(@Param("id") book:Types.ObjectId) {
        return this.booksService.getDefaultName(book);
    }
}
