import { Module } from '@nestjs/common';
import { SeriesprogressService } from './seriesprogress.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SeriesProgress, SeriesProgressSchema } from './schemas/seriesprogress.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SeriesProgress.name, schema: SeriesProgressSchema }]),
  ],
  providers: [SeriesprogressService],
  exports:[SeriesprogressService]
})
export class SeriesprogressModule {}
