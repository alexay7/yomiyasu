import {Controller, Get, Post, Body, Param, Delete, Req, UnauthorizedException, UseGuards, Query} from "@nestjs/common";
import {UserwordsService} from "./userwords.service";
import {CreateUserwordDto} from "./dto/create-userword.dto";
import {Types} from "mongoose";
import {Request} from "express";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {ApiTags} from "@nestjs/swagger";

@Controller("userwords")
@ApiTags("Palabra de usuarios")
@UseGuards(JwtAuthGuard)
export class UserwordsController {
    constructor(private readonly userwordsService: UserwordsService) {}

    @Post()
    create(@Req() req:Request, @Body() createUserwordDto: CreateUserwordDto) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        return this.userwordsService.createOrUpdate(userId, createUserwordDto);
    }

    @Get()
    findAll(@Req() req:Request, @Query("sort") sort:string) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};
      
        return this.userwordsService.findAll(userId, sort);
    }

    @Delete(":word")
    remove(@Req() req:Request, @Param("word") word: string) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        return this.userwordsService.remove(userId, word);
    }
}
