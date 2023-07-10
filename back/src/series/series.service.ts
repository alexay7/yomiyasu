import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Serie, SerieDocument } from './schemas/series.schema';

@Injectable()
export class SeriesService {
  constructor(
    @InjectModel(Serie.name) private seriesModel: Model<SerieDocument>,
  ) {}
  private readonly logger = new Logger(SeriesService.name);

  async updateOrCreate(newSerie: {
    path: string;
    visibleName: string;
    sortName: string;
  }): Promise<Serie | null> {
    const found = await this.seriesModel.findOne({ path: newSerie.path });

    /**
     * Si existe es que se ha encontrado una serie que fue
     * marcada como borrada. Quitar la marca.
     */

    if (found) {
      this.logger.log(
        '\x1b[34m' + newSerie.path + ' restaurada a la biblioteca',
      );
      return this.seriesModel.findOneAndUpdate(
        { path: newSerie.path },
        { missing: false },
      );
    }

    // Si no existe, crearla
    this.logger.log('\x1b[34m' + newSerie.path + ' añadida a la biblioteca');
    return this.seriesModel.create(newSerie);
  }

  findNonMissing(): Promise<Serie[]> {
    return this.seriesModel.find({ missing: false });
  }

  findMissing(): Promise<Serie[]> {
    return this.seriesModel.find({ missing: true });
  }

  markAsMissing(path: string): Promise<Serie | null> {
    this.logger.log('\x1b[34m' + path + ' marcada como desaparecida.');
    return this.seriesModel.findOneAndUpdate(
      { path },
      { missing: true },
      { new: true },
    );
  }
}
