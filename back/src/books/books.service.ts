import {Injectable, Logger} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Book, BookDocument} from "./schemas/book.schema";
import {Model, Types} from "mongoose";
import {SearchQuery, UserBook} from "./interfaces/query";

@Injectable()
export class BooksService {
    constructor(
        @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>
    ) {}
  private readonly logger = new Logger(BooksService.name);

  async filterBooks(user:Types.ObjectId, query:SearchQuery):Promise<UserBook[]> {

      const aggregate = this.bookModel.aggregate()
          .match({missing:false});

      // Filtrado por nombre
      if (query.name) { 
          const regex = new RegExp(query.name, "i");
          aggregate.match({$or:[{"sortName":{$regex:regex}}, {"visibleName":{$regex:regex}}]});
      }

      // Filtrado por autor/es
      if (query.author) aggregate.match({"authors":{$in:[query.author]}});

      // Filtrado por serie (path, no _id)
      if (query.serie) aggregate.match({"serie":new Types.ObjectId(query.serie)});

      /**
     * OBTENER EL ESTADO DE LECTURA DEL USUARIO
     */
      // JOIN a la tabla de PROGRESOS
      aggregate.lookup({
          from:"readprogresses",
          let: {book_id: "$_id"},
          as:"progress",
          pipeline:[
              {"$match":{$expr:{$eq:["$$book_id", "$book"]}}},
              {"$match":{"user":new Types.ObjectId(user)}},
              {$sort: {_id: -1}},
              {$limit: 1}
          ]
      })
      // JOIN a la tabla de LISTAS DE LECTURA
          .lookup({
              from:"readlists",
              let: {book_id: "$_id"},
              as:"readlist",
              pipeline:[
                  {"$match":{$expr:{$eq:["$$book_id", "$book"]}}},
                  {"$match":{"user":new Types.ObjectId(user)}}
              ]
          })
      // Asignar el parámetro status según lo encontrado
          .addFields({
              "lastProgress":{$last:"$progress"}
          })
          .addFields({
              "status":{"$cond":{
                  if: {$ifNull:["$lastProgress", null]},
                  then: "$lastProgress.status",
                  else: {
                      $cond: {
                          if: {$gt: [{$size: "$readlist"}, 0]},
                          then: "readlist",
                          else: "unread"
                      }
                  }
              }}
          }).project({readlist:0}).project({progress:0});

      // Filtrado por estado
      if (query.status) aggregate.match({"status":query.status});

      // Como ordenar los resultados | ! = descendente
      if (query.sort) {
          if (query.sort.includes("!")) {
              aggregate.sort({[query.sort.replace("!", "")]:"desc"});
          } else {
              aggregate.sort({[query.sort]:"asc"});
          }
      }

      if (query.limit && query.page) {
          aggregate.skip((query.page - 1) * query.limit).limit(parseInt(`${query.limit}`));
      }

      aggregate.addFields({"type":"book"});

      const books = await aggregate as UserBook[];

      return books;
  }

  async findById(id: Types.ObjectId): Promise<Book | null> {
      return this.bookModel.findById(id);
  }

  async getSerieStats(userId:Types.ObjectId, serie:Types.ObjectId) {
      const unreadBooks = await this.filterBooks(userId, {serie:serie._id, sort:"sortName", status:"unread"});
      let thumbnail:string | undefined;

      if (unreadBooks.length === 0) {
          const firstBook = await this.filterBooks(userId, {serie:serie._id, sort:"sortName"});
          if (firstBook.length > 0) {
              thumbnail = `${firstBook[0].seriePath}/${firstBook[0].path}/${firstBook[0].thumbnailPath}`;   
          }
      } else {
          thumbnail = `${unreadBooks[0].seriePath}/${unreadBooks[0].imagesFolder}/${unreadBooks[0].thumbnailPath}`;  
      }

      if (thumbnail) {
          return {unreadBooks:unreadBooks.length,
              thumbnailPath:thumbnail,
              type:"serie"};
      }

      return null;
  }

  async updateOrCreate(newBook: {
      path: string;
      visibleName: string;
      sortName: string;
      imagesFolder: string;
      serie: Types.ObjectId;
      seriePath:string;
      pages: number;
  }): Promise<Book | null> {
      const found = await this.bookModel.findOne({path: newBook.path});

      /**
     * Si existe es que se ha encontrado un libro que fue
     * marcado como borrado. Quitar la marca.
     */

      if (found) {
          this.logger.log(
              "\x1b[34m" + newBook.path + " restaurada a la biblioteca"
          );
          return this.bookModel.findOneAndUpdate(
              {path: newBook.path},
              {missing: false}
          );
      }
      // Si no existe, crearlo
      this.logger.log("\x1b[34m" + newBook.path + " añadido a la biblioteca");
      return this.bookModel.create(newBook);
  }

  findNonMissing(): Promise<Book[]> {
      return this.bookModel.find({missing: false});
  }

  findMissing(): Promise<Book[]> {
      return this.bookModel.find({missing: true});
  }

  markAsMissing(path: string): Promise<Book | null> {
      this.logger.log("\x1b[34m" + path + " marcado como desaparecido.");
      return this.bookModel.findOneAndUpdate(
          {path},
          {missing: true},
          {new: true}
      );
  }
}
