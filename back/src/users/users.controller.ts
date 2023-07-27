import {
    Controller,
    Post,
    Body,
    Patch,
    UseGuards,
    HttpStatus,
    Req,
    UnauthorizedException
} from "@nestjs/common";
import {UsersService} from "./users.service";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {Types} from "mongoose";
import {Request} from "express";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {TokensService} from "../tokens/tokens.service";

@Controller("users")
@ApiTags("Usuarios")
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly tokensService:TokensService
    ) {}

    @Post()
    @ApiOkResponse({status:HttpStatus.CREATED})
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Patch("update")
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({status:HttpStatus.OK})
    async update(@Req() req:Request, @Body() updateUserDto: UpdateUserDto) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.update(userId, updateUserDto);
        
        if (updateUserDto.newPassword && updateUserDto.oldPassword) {
            await this.tokensService.revokeAllUserTokens(userId);
        }

        return {status:"OK"};
    }
}
