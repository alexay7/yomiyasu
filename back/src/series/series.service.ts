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
      return this.seriesModel.findByIdAndUpdate(id, {$inc:{bookCount:1}, $set:{lastModifiedDate:new Date()}});
  }

  async filterSeries(user:Types.ObjectId, variant:"manga" | "novela" | "all", query:SeriesSearch) {
      const result = this.seriesModel.aggregate().collation({locale: "es"}).match({bookCount:{$gt:0}});

      if (variant !== "all") {
          result.match({variant});
      }

      if (query.author) {
          result.match({authors:{$in:[query.author]}});
      }

      if (query.genre) {
          result.match({genres:{$in:[query.genre]}});
      }

      if (query.name) {
          const regex = new RegExp(query.name.replace(/\s+/g, ".*"), "i");
          result.match({$or:[{"visibleName":{$regex:regex}}, {"alternativeNames":{$in:[regex]}}]});
      }

      if ((query.min && query.min !== 0)) {
          result.match({difficulty:{$gt:query.min - 1}});
      }

      if (query.max && query.max !== 10) {
          result.match({difficulty:{$lt:query.max + 1}});
      }

      if (query.firstLetter) {
          if (query.firstLetter === "SPECIAL") {
              result.match({"sortName":{$regex:"^[^a-zA-Z]", $options:"i"}});
          } else {
              result.match({"sortName": {$regex: "^" + query.firstLetter, $options: "i"}});
          }
      }

      if (query.status) {
          result.match({status:query.status});
      }

      // Como ordenar los resultados | ! = descendente
      if (query.sort) {
          if (query.sort.includes("difficulty")) {
              result.match({difficulty:{$exists:true}});
              result.match({difficulty:{$ne:0}});
          }

          if (query.sort.includes("!")) {
              result.sort({[query.sort.replace("!", "")]:"desc", _id:-1});
          } else {
              result.sort({[query.sort]:"asc", _id:-1});
          }
      }

      const countQuery = await this.seriesModel.aggregate(result.pipeline()).count("total");

      //   Si la query no tiene que ver con el progreso o la lista de lectura, hacer el corte ya
      if (!query.readprogress && !query.readlist && query.limit) {
          if (query.limit && query.page) {
              result.skip((query.page - 1) * query.limit);
          }
          result.limit(query.limit);
      }

      // Se obtienen los progresos del usuario
      result.lookup({
          from:"serieprogresses",
          let: {serie_id: "$_id"},
          as:"serieprogress",
          pipeline:[
              {"$match":{$expr:{$eq:["$$serie_id", "$serie"]}}},
              {"$match":{"user":new Types.ObjectId(user)}}
          ]
      }).unwind({path:"$serieprogress", preserveNullAndEmptyArrays:true});


      // Se obtienen las listas de lectura del usuario
      result.lookup({
          from:"readlists",
          let: {serie_id: "$_id"},
          as:"seriereadlist",
          pipeline:[
              {"$match":{$expr:{$eq:["$$serie_id", "$serie"]}}},
              {"$match":{"user":new Types.ObjectId(user)}}
          ]
      }).unwind({path:"$seriereadlist", preserveNullAndEmptyArrays:true});

      const results = await result;

      return {data:results, pages: Math.ceil((countQuery[0] || {total:0}).total / (query.limit || 1))};
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
      return pipe[0] || {genres:[], authors:[]};
  }

  getAlphabetCount(variant:"manga" | "novela", query?:SeriesSearch) {
      const pipe = this.seriesModel.aggregate().match({variant});
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
          
          if ((query.min && query.min !== 0)) {
              pipe.match({difficulty:{$gt:query.min - 1}});
          }
  
          if (query.max && query.max !== 10) {
              pipe.match({difficulty:{$lt:query.max + 1}});
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

  async getIdFromPath(path:string, variant:"manga" | "novela"):Promise<Types.ObjectId> {
      const foundSerie = await this.seriesModel.findOne({path, variant}, {_id:1});
      return foundSerie?._id;
  }

  findNonMissing(variant:"manga" | "novela"): Promise<Serie[]> {
      return this.seriesModel.find({missing: false, variant});
  }

  findMissing(variant:"manga" | "novela"): Promise<Serie[]> {
      return this.seriesModel.find({missing: true, variant});
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
