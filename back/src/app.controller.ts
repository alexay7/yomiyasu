import {
    Controller,
    Get,
    Req,
    Res,
    UseGuards,
    HttpStatus,
    UnauthorizedException,
    Param
} from "@nestjs/common";
import {AppService} from "./app.service";
import {Request, Response} from "express";
import {JwtAuthGuard} from "./auth/strategies/jwt.strategy";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {Types} from "mongoose";
import {UsersService} from "./users/users.service";
import {InjectQueue} from "@nestjs/bull";
import {Queue} from "bull";
import {Throttle} from "@nestjs/throttler";

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags("Global")
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly usersService:UsersService,
        @InjectQueue("rescan-library") private readonly rescanQueue: Queue
    ) {}

    @ApiOkResponse({status:HttpStatus.OK})
    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Get("rescan/:variant")
    @ApiOkResponse({status:HttpStatus.OK})
    async rescanLibrary(@Req() req:Request, @Param("variant") variant:"manga" | "novela") {
        if (!req.user) throw new UnauthorizedException();

        const {userId} = req.user as {userId:Types.ObjectId};

        await this.usersService.isAdmin(userId);

        const job = await this.rescanQueue.add(variant === "manga" ? "scanmangas" : "scanranobe");

        console.log(`created job ${ job.id}`);

        return {status:"OK"};
    }

    @ApiOkResponse({status:HttpStatus.OK})
    @Get("static/*")
    @Throttle(200, 10)
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
