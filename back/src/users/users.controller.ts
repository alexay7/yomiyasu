import {
    Controller,
    Post,
    Body,
    Patch,
    UseGuards,
    HttpStatus,
    Req,
    UnauthorizedException,
    Get,
    Param,
    Delete
} from "@nestjs/common";
import {UsersService} from "./users.service";
import {UpdateUserDto} from "./dto/update-user.dto";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {Types} from "mongoose";
import {Request} from "express";
import {JwtAuthGuard} from "../auth/strategies/jwt.strategy";
import {TokensService} from "../tokens/tokens.service";
import {ParseObjectIdPipe} from "../validation/objectId";

@Controller("users")
@ApiTags("Usuarios")
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly tokensService:TokensService
    ) {}

    @Get()
    @ApiOkResponse({status:HttpStatus.OK})
    @UseGuards(JwtAuthGuard)
    async findUsers(@Req() req:Request) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        return this.usersService.getUsers();
    }

    @Post(":user/admin")
    @ApiOkResponse({status:HttpStatus.OK})
    @UseGuards(JwtAuthGuard)
    async changeAdmin(@Req() req:Request, @Param("user", ParseObjectIdPipe) userId:Types.ObjectId, @Body() body:{admin:boolean}) {
        if (!req.user) throw new UnauthorizedException();

        const {userId: reqUserId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(reqUserId);

        return this.usersService.changeUserRole(userId, body.admin);
    }

    @Delete(":user")
    @ApiOkResponse({status:HttpStatus.OK})
    @UseGuards(JwtAuthGuard)
    async deleteUser(@Req() req:Request, @Param("user", ParseObjectIdPipe) userId:Types.ObjectId) {
        if (!req.user) throw new UnauthorizedException();

        const {userId: reqUserId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(reqUserId);

        return this.usersService.deleteUser(userId);
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
