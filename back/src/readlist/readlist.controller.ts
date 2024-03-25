import {
    Controller,
    Post,
    Body,
    UnauthorizedException,
    Req,
    UseGuards,
    Get,
    HttpStatus,
    Param
} from "@nestjs/common";
import {ReadlistService} from "./readlist.service";
import {Request} from "express";
import {Types} from "mongoose";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {CreateReadlistDto} from "./dto/create-readlist.dto";

@Controller("readlists")
@ApiTags("Listas de Lectura")
@UseGuards(JwtAuthGuard)
export class ReadlistController {
    constructor(private readonly readlistService: ReadlistService) {}

    @Post()
    @ApiOkResponse({status:HttpStatus.CREATED})
    create(@Req() req: Request, @Body() createReadListDto: CreateReadlistDto) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};
        return this.readlistService.create({user: userId, serie: createReadListDto.serie});
    }

    @Get(":variant")
    @ApiOkResponse({status:HttpStatus.OK})
    getReadList(@Req() req: Request, @Param("variant") variant: "manga" | "novela") {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};
        return this.readlistService.getUserReadListSeries(userId, variant);
    }

    @Post("delete")
    @ApiOkResponse({status:HttpStatus.OK})
    removeBookFromList(
    @Req() req: Request,
        @Body() body: {serie: Types.ObjectId}
    ) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};
        return this.readlistService.removeSerieFromUserList(userId, body.serie);
    }
}
