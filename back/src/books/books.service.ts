import {Injectable, Logger, NotFoundException} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Book, BookDocument} from "./schemas/book.schema";
import {Model, Types} from "mongoose";
import {SearchQuery, UpdateBook, UserBook} from "./interfaces/query";
import * as archiver from "archiver";
import * as fs from "fs-extra";
import * as path from "path";

@Injectable()
export class BooksService {
    constructor(
        @InjectModel(Book.name) private readonly bookModel: Model<BookDocument>
    ) {}
  private readonly logger = new Logger(BooksService.name);

  async filterBooks(user:Types.ObjectId, variant:"manga" | "novela" | "all", query:SearchQuery):Promise<UserBook[]> {
      const aggregate = this.bookModel.aggregate().collation({locale: "es"})
          .match({missing:false});

      if (variant !== "all") {
          aggregate.match({variant});
      }

      // Filtrado por nombre
      if (query.name) { 
          const regex = new RegExp("^" + query.name.replace(/\s+/g, ".*"), "i");
          //   aggregate.match({$or:[{"sortName":{$regex:regex}}, {"visibleName":{$regex:regex}}]});
          aggregate.match({sortName:{$regex:regex}});
      }

      // Filtrado por serie
      if (query.serie) aggregate.match({"serie":new Types.ObjectId(query.serie)});

      // Si no se quiere filtrar por estado, aplicar los límites antes de hacer la operación
      if (query.sort) {
          aggregate.match({[query.sort.replace("!", "")]:{$exists:true}});
          if (query.sort.includes("!")) {
              aggregate.sort({[query.sort.replace("!", "")]:"desc"});
          } else {
              aggregate.sort({[query.sort]:"asc"});
          }
      }
  
      if (query.limit && query.page) {
          aggregate.skip((query.page - 1) * query.limit).limit(parseInt(`${query.limit}`));
      }

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
              let: {serie_id: "$serie"},
              as:"readlist",
              pipeline:[
                  {"$match":{$expr:{$eq:["$$serie_id", "$serie"]}}},
                  {"$match":{"user":new Types.ObjectId(user)}}
              ]
          })
      // Asignar el parámetro status según lo encontrado
          .addFields({
              "lastProgress":{$last:"$progress"}
          })
          .addFields({
              "readlist":{"$cond":{
                  if: {$gt: [{$size: "$readlist"}, 0]},
                  then: true,
                  else: false
              }}
          })
          .addFields({
              "status":{"$cond":{
                  if: {$ifNull:["$lastProgress", null]},
                  then: "$lastProgress.status",
                  else: "unread"
              }}
          }).project({progress:0}).project({pageChars:0});

      // Filtrado por estado
      if (query.status) aggregate.match({"status":query.status});

      if (query.limit && query.page) {
          aggregate.skip((query.page - 1) * query.limit).limit(parseInt(`${query.limit}`));
      }

      aggregate.addFields({"type":"book"});

      const books = await aggregate as UserBook[];

      return books;
  }

  async zipBooksFromSerie(serie:Types.ObjectId){
    const books = await this.bookModel.find({serie}).sort({sortName:1});

    await Promise.all(books.map(async book=>{
        const mainFolderPath = path.join(process.cwd(), "..", "exterior", "mangas");

        const zipPath = path.join(mainFolderPath, book.seriePath,`${book.imagesFolder}.cbz`);
        const folderPath = path.join(mainFolderPath, book.seriePath, book.imagesFolder);

        // Check if zip exists
        if (fs.existsSync(zipPath)) {
            return;
        }

        await this.zipImagesFolder(folderPath, zipPath);
  }))
}

  async zipImagesFolder(folderPath:string, zipPath:string){
    // Create a zip file with the contents of the folder
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", {zlib: {level: 9}});
    output.on("close", () => {
        console.log(archive.pointer() + " total bytes");
        console.log("archiver has been finalized and the output file descriptor has closed.");
    });
    archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
            console.log(err);
        } else {
            throw err;
        }
    });
    archive.on("error", (err) => {
        throw err;
    });
    archive.pipe(output);
    archive.directory(folderPath, false);
    await archive.finalize();
  }

  async findById(id: Types.ObjectId): Promise<Book | null> {
      return this.bookModel.findById(id);
  }

  async editBook(id:Types.ObjectId, updateBook:UpdateBook) {
      return this.bookModel.findByIdAndUpdate(id, updateBook, {new:true});
  }

  async getSerieBooks(serie:Types.ObjectId) {
      return this.bookModel.find({serie:new Types.ObjectId(serie)}).sort({sortName:1});
  }

  async getSerieStats(userId:Types.ObjectId, serie:Types.ObjectId, variant:"manga" | "novela") {
      const serieBooks = await this.filterBooks(userId, variant, {serie:serie._id, sort:"sortName"});
      const unreadBooks = serieBooks.filter(x=>x.status === "unread");
      const readingBooks = serieBooks.filter(x=>x.status === "reading");
      let currentBook:Types.ObjectId | undefined = undefined;
      let thumbnail:string | undefined;

      const paused = serieBooks.some(x=>{
          if (!x.lastProgress) return;
          return x.lastProgress.paused;
      });

      if (readingBooks.length > 0) {
          thumbnail = variant === "manga" ?  `${readingBooks[0].seriePath}/${readingBooks[0].imagesFolder}/${readingBooks[0].thumbnailPath}` : `${readingBooks[0].seriePath}/${readingBooks[0].thumbnailPath}`;
          currentBook = readingBooks[0]._id;

          if (readingBooks[0].mokured) {
              thumbnail = `${readingBooks[0].seriePath}/${readingBooks[0].imagesFolder}/${readingBooks[0].thumbnailPath}`;
          }
      }
      else if (unreadBooks.length === 0) {
          if (serieBooks.length > 0) {
              thumbnail = variant === "manga" ?  `${serieBooks[0].seriePath}/${serieBooks[0].imagesFolder}/${serieBooks[0].thumbnailPath}` : `${serieBooks[0].seriePath}/${serieBooks[0].thumbnailPath}`;   
              currentBook = serieBooks[0]._id;

              if (serieBooks[0].mokured) {
                  thumbnail = `${serieBooks[0].seriePath}/${serieBooks[0].imagesFolder}/${serieBooks[0].thumbnailPath}`;
              }
          }
      } else {
          thumbnail = variant === "manga" ?  `${unreadBooks[0].seriePath}/${unreadBooks[0].imagesFolder}/${unreadBooks[0].thumbnailPath}` : `${unreadBooks[0].seriePath}/${unreadBooks[0].thumbnailPath}`;  
          currentBook = unreadBooks[0]._id;

          if (unreadBooks[0].mokured) {
              thumbnail = `${unreadBooks[0].seriePath}/${unreadBooks[0].imagesFolder}/${unreadBooks[0].thumbnailPath}`;
          }
      }

      if (thumbnail) {
          return {
              unreadBooks:unreadBooks.length,
              thumbnailPath:thumbnail,
              currentBook,
              type:"serie",
              paused
          };
      }

      return null;
  }

  async getDefaultName(book:Types.ObjectId, change?:boolean) {
      const pipe = await this.bookModel.aggregate()
          .match({_id:new Types.ObjectId(book)})
          .lookup({
              from:"series",
              localField:"serie",
              foreignField:"_id",
              as:"serieInfo"
          })
          .unwind({path:"$serieInfo"});

      if (pipe.length === 0) throw new NotFoundException();
      const foundBook = pipe[0];

      const serieBooks = await this.bookModel.find({serie:foundBook.serie}).sort({sortName:1});
      const bookIndex = serieBooks.findIndex(x=>x.path === foundBook.path);

      const volNumber = `${bookIndex + 1}`.padStart(serieBooks.length.toString().length, "0");
      const newName = `${foundBook.serieInfo.visibleName} v${volNumber}`;
      if (change) {
          await this.bookModel.findByIdAndUpdate(book, {visibleName:newName});
      }
      return {name:newName};
  }

  async updateOrCreate(newBook: {
      path: string;
      visibleName: string;
      sortName: string;
      imagesFolder?: string;
      serie: Types.ObjectId;
      seriePath:string;
      pages?: number;
      characters:number;
      thumbnailPath: string;
      variant:"manga" | "novela";
      pageChars?:number[];
  }): Promise<Book | null> {
      const found = await this.bookModel.findOne({path: newBook.path, variant:newBook.variant});

      /**
     * Si existe es que se ha encontrado un libro que fue
     * marcado como borrado. Quitar la marca.
     */

      if (found) {
          this.logger.log(
              "\x1b[34m" + newBook.path + " restaurada a la biblioteca"
          );
          return this.bookModel.findOneAndUpdate(
              {path: newBook.path, variant:newBook.variant},
              {missing: false}
          );
      }
      // Si no existe, crearlo
      this.logger.log("\x1b[34m" + newBook.path + " añadido a la biblioteca");
      return this.bookModel.create(newBook);
  }

  findNonMissing(variant:"manga" | "novela"): Promise<Book[]> {
      return this.bookModel.find({missing: false, variant, mokured:{$ne:true}});
  }

  findMissing(variant:"manga" | "novela"): Promise<Book[]> {
      return this.bookModel.find({missing: true, variant});
  }

  markAsMissing(path: string, variant:"manga" | "novela"): Promise<Book | null> {
      this.logger.log("\x1b[34m" + path + " marcado como desaparecido.");
      return this.bookModel.findOneAndUpdate(
          {path, variant},
          {missing: true},
          {new: true}
      );
  }

  getArtistsAndGenres() {
      return this.bookModel.aggregate()
          .group({
              _id:null,
              genres:{$addToSet:"$genres"},
              authors:{$addToSet:"$authors"}
          });
  }
}
