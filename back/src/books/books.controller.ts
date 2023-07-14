import { Controller,Get,Req,UnauthorizedException,UseGuards,Query } from '@nestjs/common';
import { BooksService } from './books.service';
import { Request } from 'express';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/strategies/jwt.strategy';
import { SearchQuery, UserBook } from './interfaces/query';
import { SeriesprogressService } from '../seriesprogress/seriesprogress.service';

@Controller('books')
@UseGuards(JwtAuthGuard)
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly seriesProgressService:SeriesprogressService
    ) {}
  
  @Get()
  filterBooks(@Req() req:Request,@Query() query:SearchQuery){
    if (!req.user) throw new UnauthorizedException();

    const { userId } = req.user as { userId: Types.ObjectId };

    return this.booksService.filterBooks(userId,query)
  }

  @Get("tablero")
  async getSeriesProgress(@Req() req:Request){
    if (!req.user) throw new UnauthorizedException();

    const { userId } = req.user as { userId: Types.ObjectId };

    // Se obtiene el progreso de todas las series del usuario
    const seriesProgresses = await this.seriesProgressService.getUserProgress(userId)
    
    let returnBooks:UserBook[]=[];

    // Por cada serie se busca el progreso de cada libro
    await Promise.all(seriesProgresses.map(async(progress)=>{
      const books = await this.booksService.filterBooks(userId,{serie:progress.serie,sort:"sortName"})
      /**
       * Si la serie tiene libros siendo leidos, no hace falta que aparezca en el tablero
       */
      if(!books.some(x=>x.status==="READING")){
        // Se filtran todos los libros que no hayan sido leidos de la serie y se añade al array el primero
        const unreadBooks = books.filter(x=>x.status!=="COMPLETED")
        if(unreadBooks.length>0){
          returnBooks = returnBooks.concat(unreadBooks[0])
        }
      }
    })
    )

    return(returnBooks)
  }
}
