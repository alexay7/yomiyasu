import { Controller,Get,Req,UnauthorizedException,UseGuards,Query, Param } from '@nestjs/common';
import { BooksService } from './books.service';
import { Request } from 'express';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { SearchQuery, UserBook } from './interfaces/query';

@Controller('books')
@UseGuards(JwtAuthGuard)
export class BooksController {
  constructor(
    private readonly booksService: BooksService
    ) {}
  
  @Get()
  filterBooks(@Req() req:Request,@Query() query:SearchQuery){
    if (!req.user) throw new UnauthorizedException();

    const { userId } = req.user as { userId: Types.ObjectId };

    return this.booksService.filterBooks(userId,query)
  }

  @Get(":id")
  async getBook(@Param("id") book:Types.ObjectId){
    return this.booksService.findById(book)
  }
}
