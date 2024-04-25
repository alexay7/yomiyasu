import {Controller, Post, Body, UseGuards, Req, UnauthorizedException} from "@nestjs/common";
import {InvisService} from "./invis.service";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {Request} from "express";
import {Types} from "mongoose";
import {RegisterUserDto} from "./dto/register-user.dto";
import {Throttle} from "@nestjs/throttler";
import {AuthService} from "../auth/auth.service";
import {UsersService} from "../users/users.service";

@Controller("invis")
export class InvisController {
    constructor(private readonly invisService: InvisService,
        private readonly authService:AuthService,
        private readonly usersService:UsersService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Req() req:Request) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        return this.invisService.create();
    }

    @Post("redeem")
    @Throttle(1, 60)
    async registerUser(@Body() body:RegisterUserDto) {
        const invi = await this.invisService.useCode(body.code);

        if (!invi) throw new UnauthorizedException("Invalid code");

        const newUser = await this.authService.signUp({...body});

        await this.invisService.assignUser(body.code, newUser._id!);

        return newUser;
    }
}
