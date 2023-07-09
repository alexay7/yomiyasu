import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from './auth/strategies/jwt.strategy';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  testing(@Body() body: { page: number }) {
    console.log(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('static/*')
  serveFiles(@Req() req: Request, @Res() res: Response) {
    return res.sendFile(
      /**
       * Las rutas van a tender a usar elementos japoneses así que es necesario decodificar la url
       * para poder acceder bien a los archivos del sistema
       */
      decodeURIComponent(req.path.replace('/api/static', '')),
      {
        root: './../exterior',
      },
    );
  }
}
