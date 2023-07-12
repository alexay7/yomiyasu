import { Module } from '@nestjs/common';
import { ReadprogressService } from './readprogress.service';
import { ReadprogressController } from './readprogress.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ReadProgress,
  ReadProgressSchema,
} from './schemas/readprogress.schema';
import { ReadlistModule } from '../readlist/readlist.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReadProgress.name, schema: ReadProgressSchema },
    ]),
    ReadlistModule,
  ],
  controllers: [ReadprogressController],
  providers: [ReadprogressService],
  exports: [ReadprogressService],
})
export class ReadprogressModule {}
