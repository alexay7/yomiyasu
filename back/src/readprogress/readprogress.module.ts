import { Module } from '@nestjs/common';
import { ReadprogressService } from './readprogress.service';
import { ReadprogressController } from './readprogress.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ReadProgress,
  ReadProgressSchema,
} from './schemas/readprogress.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReadProgress.name, schema: ReadProgressSchema },
    ]),
  ],
  controllers: [ReadprogressController],
  providers: [ReadprogressService],
})
export class ReadprogressModule {}
