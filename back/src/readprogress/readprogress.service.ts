import {BadRequestException, Injectable, NotFoundException} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {ReadProgress, ReadProgressStatus} from "./schemas/readprogress.schema";
import {Model, Types} from "mongoose";
import {
    CreateReadProgress,
    UpdateReadProgress
} from "./interfaces/readprogress.interface";
import {SerieprogressService} from "../serieprogress/serieprogress.service";

@Injectable()
export class ReadprogressService {
    constructor(
        @InjectModel(ReadProgress.name)
        private readonly readProgressModel: Model<ReadProgress>,
        private readonly seriesProgressService:SerieprogressService
    ) {}

    findProgressByBookAndUser(book:Types.ObjectId, user:Types.ObjectId, status?:ReadProgressStatus):Promise<ReadProgress | null> {
        const query = this.readProgressModel.findOne({user, book}).sort({startDate:-1});

        if (status) {
            query.where({status});
        }

        return query;
    }

    async findUserProgresses(user:Types.ObjectId, page:number, limit:number, sort:string) {
        const result = this.readProgressModel.aggregate()
            .match({user:new Types.ObjectId(user), status:{$ne:"unread"}})
            .lookup({from:"books", localField:"book", foreignField:"_id", as:"bookInfo"})
            .unwind({path:"$bookInfo"})
            .lookup({from:"series", localField:"serie", foreignField:"_id", as:"serieInfo"})
            .unwind({path:"$serieInfo"});
      
        if (sort === "book") {
            if (sort.includes("!")) {
                result.sort({"bookInfo._id":"desc"});
            } else {
                result.sort({"bookInfo._id":"asc"});
            }
        }
        else if (sort === "serie") {
            if (sort.includes("!")) {
                result.sort({"serieInfo._id":"desc"});
            } else {
                result.sort({"serieInfo._id":"asc"});
            }
        }
        else {
            if (sort.includes("!")) {
                result.sort({[sort.replace("!", "")]:"desc"});
            } else {
                result.sort({[sort]:"asc"});
            }
        }

        const count = await this.readProgressModel.aggregate(result.pipeline()).count("total");

        if (!count || count.length === 0) throw new BadRequestException();

        const data = await result.skip((page - 1) * limit)
            .limit(limit);

        return {data, total:count[0].total};            
    }

    createReadProgress(createReadProgress:CreateReadProgress):Promise<ReadProgress> {
        return this.readProgressModel.create(createReadProgress);
    }

    modifyReadProgress(id:Types.ObjectId, updateReadProgress:UpdateReadProgress):Promise<ReadProgress | null> {

        return this.readProgressModel.findByIdAndUpdate(id, updateReadProgress, {new:true});
    }

    async getReadingBooks(user:Types.ObjectId) {
        const pipe = await this.readProgressModel.aggregate()
            .match({user:new Types.ObjectId(user)})
            .match({status:"reading"})
            .sort({lastUpdateDate:-1})
            .addFields({lastProgress: "$$ROOT"})
            .lookup({
                from: "books",
                localField: "book",
                foreignField: "_id",
                as: "bookInfo"
            })
            .unwind({
                path: "$bookInfo",
                includeArrayIndex: "string",
                preserveNullAndEmptyArrays: false
            }).addFields({
                "bookInfo.lastProgress": "$lastProgress"
            }).replaceRoot("$bookInfo").addFields({
                status: "reading",
                type: "book"
            });
        return pipe;
    }

    async deleteReadProgress(id:Types.ObjectId, user:Types.ObjectId) {
        const foundProgress = await this.readProgressModel.findById(id);

        if (!foundProgress) throw new NotFoundException();

        const totalReads = await this.readProgressModel.count({user, book:foundProgress?.book});

        if (totalReads === 1) {
            await this.seriesProgressService.createOrIncreaseBooks({book:foundProgress.book, user, action:"remove", serie:foundProgress.serie});
        }

        return this.readProgressModel.findOneAndDelete({_id:id, user});
    }

    async modifyWholeSerie(serie:Types.ObjectId, user:Types.ObjectId, paused:boolean) {
        return this.readProgressModel.updateMany({serie:new Types.ObjectId(serie), user:new Types.ObjectId(user)}, {paused});
    }

    async getReadingSeries(user:Types.ObjectId) {
        return this.readProgressModel.find({user, status:"reading"});
    }
}
