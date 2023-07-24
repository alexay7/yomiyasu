import {Controller, Get, Req, UnauthorizedException, UseGuards, Query, Param, HttpStatus} from "@nestjs/common";
import {BooksService} from "./books.service";
import {Request} from "express";
import {Types} from "mongoose";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {SearchQuery} from "./interfaces/query";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";

@Controller("books")
@ApiTags("Libros")
@UseGuards(JwtAuthGuard)
export class BooksController {
    constructor(
        private readonly booksService: BooksService
    ) {}
  
    @Get()
    @ApiOkResponse({status:HttpStatus.OK})
    filterBooks(@Req() req:Request, @Query() query:SearchQuery) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};

        return this.booksService.filterBooks(userId, query);
    }

    @Get(":id")
    @ApiOkResponse({status:HttpStatus.OK})
    async getBook(@Param("id") book:Types.ObjectId) {
        return this.booksService.findById(book);
    }
}
