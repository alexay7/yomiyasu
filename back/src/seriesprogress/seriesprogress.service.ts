import { Injectable } from '@nestjs/common';
import { createSeriesProgress } from './interfaces/seriesProgress.interface';
import { Model, Types } from 'mongoose';
import { SeriesProgress } from './schemas/seriesprogress.schema';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class SeriesprogressService {
  constructor(@InjectModel(SeriesProgress.name)  private readonly seriesProgressModel:Model<SeriesProgress>){}

  create(createSeriesProgress: createSeriesProgress) {
    return this.seriesProgressModel.create(createSeriesProgress)
  }

  getUserProgress(user:Types.ObjectId):Promise<SeriesProgress[]>{
    return this.seriesProgressModel.find({user})
  }
}
