import {
    Controller,
    Post,
    Req,
    Res,
    Get,
    Body,
    UnauthorizedException,
    UseGuards,
    HttpStatus
} from "@nestjs/common";
import {Request, Response} from "express";
import {AuthService} from "./auth.service";
import {RefreshJwtAuthGuard} from "./strategies/refreshToken.strategy";
import {AuthDto, RenewTokenDto} from "./dto/auth.dto";
import {CreateUserDto} from "../users/dto/create-user.dto";
import {Types} from "mongoose";
import {JwtAuthGuard} from "./strategies/jwt.strategy";
import {UsersService} from "../users/users.service";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";

@Controller("auth")
@ApiTags("Autenticación")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService:UsersService) {}

    setAuthCookies(
        response: Response,
        tokens: {
            uuid?: string;
            accessToken?: string;
            refreshToken?: string;
        }
    ): Response {
        const {accessToken, refreshToken} = tokens;

        if (accessToken) {
            // Si la función ha sido llamada con tokens, enviarselos al cliente en las cookies
            response
                .cookie("access_token", accessToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: "lax",
                    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2)
                })
                .cookie("refresh_token", refreshToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: "lax",
                    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
                });
            return response;
        } else {
            // Si ha sido llamada sin tokens, borrar las cookies para cerrar sesión
            response.clearCookie("access_token").clearCookie("refresh_token");
            return response;
        }
    }

    @Post("signup")
    @UseGuards(JwtAuthGuard)
    @ApiOkResponse({status:HttpStatus.CREATED})
    async signup(@Req()req:Request, @Body() createUserDto: CreateUserDto) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);
        
        const authResult = await this.authService.signUp(createUserDto);

        return authResult;
    }

    @Post("login")
    @ApiOkResponse({status:HttpStatus.OK})
    async login(@Res() res: Response, @Body() body: AuthDto) {
        if (!body) throw new UnauthorizedException();

        const authResult = await this.authService.signIn(body);

        const response = this.setAuthCookies(res, authResult.tokens);

        response.json({
            status: "ok",
            uuid: authResult.tokens.uuid,
            user: {
                _id:authResult.user._id,
                username:authResult.user.username,
                email:authResult.user.email,
                admin:authResult.user.admin
            }
        }).send();
    }

    @Post("logout")
    @ApiOkResponse({status:HttpStatus.OK})
    @UseGuards(JwtAuthGuard)
    logout(
    @Req() req: Request,
        @Res() res: Response,
        @Body() body: {uuid: string}
    ) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId: Types.ObjectId};

        this.authService.signOut(body.uuid, userId);

        const response = this.setAuthCookies(res, {});
        response.json({
            status: "ok",
            uuid: body.uuid
        }).send();
    }

    @UseGuards(RefreshJwtAuthGuard)
    @Post("refresh")
    @ApiOkResponse({status:HttpStatus.OK})
    async refreshToken(
    @Res() res: Response,
        @Body() body: RenewTokenDto,
        @Req() req: Request
    ) {
        const user = req.user as {refreshToken: string; sub: Types.ObjectId};

        // Comprobar que el token existe en la base de datos y que es válido
        const tokens = await this.authService.renewTokens(
            body.uuid,
            user.sub,
            user.refreshToken
        );
        const response = this.setAuthCookies(res, tokens);

        response.json({
            status: "ok",
            uuid: body.uuid
        }).send();
    }

    @Get("me")
    @ApiOkResponse({status:HttpStatus.OK})
    @UseGuards(JwtAuthGuard)
    async checkAuth(
    @Req()req:Request,
        @Res()res:Response
    ) {
        const {userId} = req.user as {userId: Types.ObjectId};

        const foundUser = await this.usersService.findById(userId);

        if (!foundUser) {
            return this.setAuthCookies(res, {});
        }

        res.json({
            _id:foundUser._id,
            username:foundUser.username,
            email:foundUser.email,
            admin:foundUser.admin
        });
    }
}
