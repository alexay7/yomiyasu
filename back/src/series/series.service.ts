import {Injectable, Logger, NotFoundException} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Model, Types} from "mongoose";
import {Serie, SerieDocument} from "./schemas/series.schema";
import {SeriesSearch, UpdateSerie} from "./interfaces/query";
import {UsersService} from "../users/users.service";
import {SerieWithReviews} from "./interfaces/serieWithProgress";
import {ParsedReview} from "../reviews/interfaces/review";

@Injectable()
export class SeriesService {
    constructor(
        @InjectModel(Serie.name) private readonly seriesModel: Model<SerieDocument>,
        private readonly usersService:UsersService
    ) {}
  private readonly logger = new Logger(SeriesService.name);

  async findById(id:Types.ObjectId) {
      const pipe = await this.seriesModel.aggregate()
          .match({_id:new Types.ObjectId(id)})
          .lookup({
              from:"reviews",
              localField:"_id",
              foreignField:"serie",
              as:"reviews"
          });

      if (pipe.length > 0) {
          const serie = pipe[0] as SerieWithReviews;

          if (serie.reviews) {
              const promises = serie.reviews.map(async(review)=>{
                  const foundUser = await this.usersService.findById(review.user);
                  const newReview:ParsedReview = {
                      ...review,
                      name:foundUser?.username || ""
                  };
                  return newReview;
              });

              const reviews = await Promise.all(promises);

              serie.reviews = reviews.sort((a, b)=>{
                  if (!a._id || !b._id) return 0;
                  if (a._id > b._id) return -1;
                  return 1;
              });
          }
          return serie;
      }
      throw new NotFoundException();
  }

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

  async editSerie(id:Types.ObjectId, updateSerie:UpdateSerie) {
      return this.seriesModel.findByIdAndUpdate(id, updateSerie);
  }

  async increaseBookCount(id:Types.ObjectId) {
      return this.seriesModel.findByIdAndUpdate(id, {$inc:{bookCount:1}});
  }

  async filterSeries(query:SeriesSearch) {
      const result = this.seriesModel.find().collation({locale: "es"});

      if (query.author) {
          result.where({authors:{$in:[query.author]}});
      }

      if (query.genre) {
          result.where({genres:{$in:[query.genre]}});
      }

      if (query.name) {
          const regex = new RegExp(query.name, "i");
          result.where({$or:[{"sortName":{$regex:regex}}, {"visibleName":{$regex:regex}}]});
      }

      if ((query.min && query.min !== "0")) {
          const min = query.min || "0";
          result.where({difficulty:{$gt:parseInt(min) - 1}});
      }

      if (query.max && query.max !== "10") {
          const max = query.max || "0";
          result.where({difficulty:{$lt:parseInt(max) + 1}});
      }

      if (query.firstLetter) {
          if (query.firstLetter === "SPECIAL") {
              result.where({"sortName":{$regex:"^[^a-zA-Z]", $options:"i"}});
          } else {
              result.where({"sortName": {$regex: "^" + query.firstLetter, $options: "i"}});
          }
      }

      if (query.status) {
          result.where({status:query.status});
      }

      // Como ordenar los resultados | ! = descendente
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

  async getArtistsAndGenres() {
      const pipe = await this.seriesModel.aggregate()
          .unwind({path:"$genres", preserveNullAndEmptyArrays:true})
          .unwind({path:"$authors", preserveNullAndEmptyArrays:true})
          .group({
              _id:null,
              genres:{$addToSet:"$genres"},
              authors:{$addToSet:"$authors"}
          }).project({_id:0});
      return pipe[0];
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
          
          if ((query.min && query.min !== "0")) {
              const min = query.min || "0";
              pipe.match({difficulty:{$gt:parseInt(min) - 1}});
          }
  
          if (query.max && query.max !== "10") {
              const max = query.max || "0";
              pipe.match({difficulty:{$lt:parseInt(max) + 1}});
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
