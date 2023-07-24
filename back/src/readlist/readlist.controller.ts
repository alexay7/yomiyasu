import {
    Controller,
    Post,
    Body,
    UnauthorizedException,
    Req,
    UseGuards,
    Get,
    Delete,
    HttpStatus
} from "@nestjs/common";
import {ReadlistService} from "./readlist.service";
import {Request} from "express";
import {Types} from "mongoose";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";

@Controller("readlist")
@ApiTags("Listas de Lectura")
@UseGuards(JwtAuthGuard)
export class ReadlistController {
    constructor(private readonly readlistService: ReadlistService) {}

    @Post()
    @ApiOkResponse({status:HttpStatus.CREATED})
    create(@Req() req: Request, @Body() body: {book: Types.ObjectId}) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};
        return this.readlistService.create({user: userId, book: body.book});
    }

    @Get()
    @ApiOkResponse({status:HttpStatus.OK})
    getReadList(@Req() req: Request) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};
        return this.readlistService.getUserReadListBooks(userId);
    }

    @Delete()
    @ApiOkResponse({status:HttpStatus.OK})
    removeBookFromList(
    @Req() req: Request,
        @Body() body: {book: Types.ObjectId}
    ) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};
        return this.readlistService.removeBookFromUserList(userId, body.book);
    }
}
