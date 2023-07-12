import {
  Controller,
  Req,
  Post,
  Body,
  NotFoundException,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ReadprogressService } from './readprogress.service';
import { CreateReadprogressDto } from './dto/create-readprogress.dto';
import { UpdateReadprogressDto } from './dto/update-readprogress.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { Types } from 'mongoose';
import {
  CreateReadProgress,
  ReadProgressWithBook,
  UpdateReadProgress,
} from './interfaces/readprogress.interface';

@Controller('readprogress')
@UseGuards(JwtAuthGuard)
export class ReadprogressController {
  constructor(private readonly readprogressService: ReadprogressService) {}

  @Post()
  async create(
    @Req() req: Request,
    @Body() createReadprogressDto: CreateReadprogressDto,
  ) {
    if (!req.user) throw new UnauthorizedException();

    const { userId } = req.user as { userId: Types.ObjectId };

    // Primero se comprueba si existe algún progreso que no esté finalizado
    const foundProgress = await this.readprogressService.findNonFinished(
      userId,
      createReadprogressDto.book,
    );

    if (foundProgress) {
      // Si se encuentra se envía al frontend para que lo trate
      return foundProgress;
    }

    // Si no se encuentra ningún progreso, se crea uno nuevo
    const newReadProgress: CreateReadProgress = {
      book: createReadprogressDto.book,
      user: userId,
    };

    return this.readprogressService.create(newReadProgress);
  }

  @Post('update')
  async update(
    @Req() req: Request,
    @Body() updateReadProgressDto: UpdateReadprogressDto,
  ) {
    if (!req.user) throw new UnauthorizedException();

    const { userId } = req.user as { userId: Types.ObjectId };

    const foundProgress = (await this.readprogressService.findNonFinished(
      userId,
      updateReadProgressDto.book,
      true,
    )) as ReadProgressWithBook;

    if (!foundProgress) throw new NotFoundException();

    const updateReadProgress: UpdateReadProgress = {
      currentPage: updateReadProgressDto.currentPage,
      time: foundProgress.time + updateReadProgressDto.time,
    };

    if (foundProgress.bookInfo.pages <= updateReadProgressDto.currentPage) {
      updateReadProgress.completed = true;
      updateReadProgress.endDate = new Date();
    }

    return this.readprogressService.updateProgress(
      userId,
      updateReadProgressDto.book,
      updateReadProgress,
    );
  }
}
