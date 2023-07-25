import {Injectable, Logger} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Model, Types} from "mongoose";
import {Serie, SerieDocument} from "./schemas/series.schema";
import {SeriesSearch} from "./interfaces/query";
import {BooksService} from "../books/books.service";

@Injectable()
export class SeriesService {
    constructor(
        @InjectModel(Serie.name) private readonly seriesModel: Model<SerieDocument>,
        private readonly booksService:BooksService
    ) {}
  private readonly logger = new Logger(SeriesService.name);

  async updateOrCreate(newSerie: {
      path: string;
      visibleName: string;
      sortName: string;
  }): Promise<Serie | null> {
      const found = await this.seriesModel.findOne({path: newSerie.path});

      /**
     * Si existe es que se ha encontrado una serie que fue
     * marcada como borrada. Quitar la marca.
     */

      if (found) {
          this.logger.log(
              "\x1b[34m" + newSerie.path + " restaurada a la biblioteca"
          );
          return this.seriesModel.findOneAndUpdate(
              {path: newSerie.path},
              {missing: false}
          );
      }

      // Si no existe, crearla
      this.logger.log("\x1b[34m" + newSerie.path + " añadida a la biblioteca");
      return this.seriesModel.create(newSerie);
  }

  async increaseBookCount(id:Types.ObjectId) {
      return this.seriesModel.findByIdAndUpdate(id, {$inc:{bookCount:1}});
  }

  async filterSeries(query:SeriesSearch) {
      const result = this.seriesModel.find();

      if (query.author) {
          result.where({authors:{$in:[query.author]}});
      }

      if (query.genre) {
          result.where({genres:{$in:[query.genre]}});
      }

      if (query.name) {
          const regex = new RegExp(query.name);
          result.where({$or:[{"sortName":{$regex:regex}}, {"visibleName":{$regex:regex}}]});
      }

      if (query.status) {
          result.where({status:query.status});
      }

      if (query.sort) {
          if (query.sort.includes("!")) {
              result.sort({[query.sort.replace("!", "")]:"desc"});
          } else {
              result.sort({[query.sort]:"asc"});
          }
      }

      const countQuery = await this.seriesModel.find().merge(result).count();

      const results = await result.skip((query.page - 1) * query.limit).limit(query.limit);

      return {data:results, pages: Math.ceil(countQuery / query.limit)};
  }

  getAlphabetCount(query?:SeriesSearch) {
      const pipe = this.seriesModel.aggregate();
      if (query) {
          if (query.author) {
              pipe.match({authors:{$in:[query.author]}});
          }
  
          if (query.genre) {
              pipe.match({genres:{$in:[query.genre]}});
          }

          if (query.status) {
              pipe.match({status:query.status});
          }
      }
      pipe.project({
          firstLetter:{$cond: {
              if: {$regexMatch: {input: "$sortName", regex: /^[a-zA-Z]/}},
              then: {$substrCP: ["$sortName", 0, 1]},
              else: "#"
          }
          }
      })
          .group({
              _id:"$firstLetter",
              count:{"$sum":1}
          })
          .sort({_id:1})
          .project({_id:0, group:"$_id", count:1});
      return pipe;
  }

  async getIdFromPath(path:string):Promise<Types.ObjectId> {
      const foundSerie = await this.seriesModel.findOne({path}, {_id:1});
      return foundSerie?._id;
  }

  findNonMissing(): Promise<Serie[]> {
      return this.seriesModel.find({missing: false});
  }

  findMissing(): Promise<Serie[]> {
      return this.seriesModel.find({missing: true});
  }

  markAsMissing(path: string): Promise<Serie | null> {
      this.logger.log("\x1b[34m" + path + " marcada como desaparecida.");
      return this.seriesModel.findOneAndUpdate(
          {path},
          {missing: true},
          {new: true}
      );
  }
}
