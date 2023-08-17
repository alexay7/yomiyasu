import {Injectable} from "@nestjs/common";
import {SerieProgress} from "./schemas/serieprogress.schema";
import {InjectModel} from "@nestjs/mongoose";
import {Model, Types} from "mongoose";
import {CreateOrModifySerieProgress} from "./interfaces/serieprogress";
import {Book} from "../books/schemas/book.schema";
import {FullSerie} from "../series/interfaces/serieWithProgress";

@Injectable()
export class SerieprogressService {
    constructor(
        @InjectModel(SerieProgress.name) private readonly serieProgressModel: Model<SerieProgress>
    ) {}

    async createOrModifySerieProgress(user:Types.ObjectId, serie:Types.ObjectId, books:Types.ObjectId[]) {
        const foundProgress = await this.serieProgressModel.findOne({
            user:user,
            serie:serie
        });

        if (foundProgress) {
            return this.serieProgressModel.findByIdAndUpdate(foundProgress._id, {readBooks:books});
        }

        const createProgress:SerieProgress = {
            serie,
            user,
            readBooks:books,
            paused:false,
            lastUpdate:new Date()
        };
        return this.serieProgressModel.create(createProgress);
    }

    async createOrIncreaseBooks(createSerieprogressDto: CreateOrModifySerieProgress) {
        const foundProgress = await this.serieProgressModel.findOne({
            user:createSerieprogressDto.user,
            serie:createSerieprogressDto.serie
        });

        if (foundProgress) {
            if (createSerieprogressDto.action === "add") {
                return this.serieProgressModel.findByIdAndUpdate(foundProgress._id, {$addToSet:{readBooks:new Types.ObjectId(createSerieprogressDto.book)}, $set:{lastUpdate:new Date()}});
            } else {
                return this.serieProgressModel.findByIdAndUpdate(foundProgress._id, {$pull:{readBooks:new Types.ObjectId(createSerieprogressDto.book)}, $set:{lastUpdate:new Date()}});
            }
        }

        const createProgress:SerieProgress = {
            ...createSerieprogressDto,
            readBooks:createSerieprogressDto.action === "add" ? [new Types.ObjectId(createSerieprogressDto.book)] : [],
            paused:false,
            lastUpdate:new Date()
        };
        return this.serieProgressModel.create(createProgress);
    }

    async getUserSeriesProgress(user:Types.ObjectId) {
        return this.serieProgressModel.aggregate()
            .match({user:new Types.ObjectId(user)})
            .lookup({from:"books", localField:"serie", foreignField:"serie", as:"serieBooks"});
    }

    async pauseSerie(user:Types.ObjectId, serie:Types.ObjectId) {
        return this.serieProgressModel.findOneAndUpdate({user, serie}, {paused:true}, {new:true});
    }

    async resumeSerie(user:Types.ObjectId, serie:Types.ObjectId) {
        return this.serieProgressModel.findOneAndUpdate({user, serie}, {paused:false}, {new:true});
    }

    getSerieProgress(serieData:FullSerie, serieBooks:Book[]) {
        const result: {
            unreadBooks:number,
            thumbnailPath:string,
            currentBook:Book,
            type:"serie",
            paused:boolean
        } = {
            unreadBooks:serieData.bookCount,
            thumbnailPath:`${serieBooks[0].seriePath}/${serieBooks[0].imagesFolder}/${serieBooks[0].thumbnailPath}`,
            currentBook:serieBooks[0],
            type:"serie",
            paused:false
        };

        const serieProgress = serieData.serieprogress;

        if (!serieProgress) {
            return result;
        }

        if (serieProgress.paused) {
            result.paused = true;
            return result;
        }

        if (serieProgress.readBooks.length === serieBooks.length) {
            result.unreadBooks = 0;
            return result;
        }

        const unreadBooks = serieBooks.filter(
            x=>serieProgress.readBooks.findIndex(
                y=>y._id.equals(x._id as Types.ObjectId)
            ) === -1
        );

        result.unreadBooks = unreadBooks.length;
        const currentBook = unreadBooks[0];
        result.currentBook = currentBook;
        result.thumbnailPath = `${currentBook.seriePath}/${currentBook.imagesFolder}/${currentBook.thumbnailPath}`;
        return result;
    }
}
