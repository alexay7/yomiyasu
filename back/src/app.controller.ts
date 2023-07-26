import {
    Controller,
    Get,
    Req,
    Res,
    UseGuards,
    HttpStatus,
    UnauthorizedException
} from "@nestjs/common";
import {AppService} from "./app.service";
import {Request, Response} from "express";
import {JwtAuthGuard} from "./auth/strategies/jwt.strategy";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {Types} from "mongoose";
import {UsersService} from "./users/users.service";

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags("Global")
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly usersService:UsersService) {}

    @ApiOkResponse({status:HttpStatus.OK})
    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Get("rescan")
    @ApiOkResponse({status:HttpStatus.OK})
    async rescanLibrary(@Req() req:Request) {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        await this.appService.rescanLibrary();

        return {status:"OK"};
    }

    @ApiOkResponse({status:HttpStatus.OK})
    @Get("static/*")
    serveFiles(@Req() req: Request, @Res() res: Response) {
        return res.sendFile(
            /**
       * Las rutas van a tender a usar elementos japoneses así que es necesario decodificar la url
       * para poder acceder bien a los archivos del sistema
       */
            decodeURIComponent(req.path.replace("/api/static", "")),
            {
                root: "./../exterior"
            }, function(err) {
                if (err) {
                    res.sendStatus(404);
                }
            }
        );
    }
}
