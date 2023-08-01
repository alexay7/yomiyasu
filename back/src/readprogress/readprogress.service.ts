import {Injectable} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {ReadProgress, ReadProgressStatus} from "./schemas/readprogress.schema";
import {Model, QueryOptions, Types} from "mongoose";
import {
    CreateReadProgress,
    UpdateReadProgress
} from "./interfaces/readprogress.interface";

@Injectable()
export class ReadprogressService {
    constructor(
        @InjectModel(ReadProgress.name)
        private readonly readProgressModel: Model<ReadProgress>
    ) {}

    findProgressByBookAndUser(book:Types.ObjectId, user:Types.ObjectId, status?:ReadProgressStatus):Promise<ReadProgress | null> {
        const query = this.readProgressModel.findOne({user, book}).sort({startDate:-1});

        if (status) {
            query.where({status});
        }

        return query;
    }

    findUserProgresses(user:Types.ObjectId) {
        return this.readProgressModel.aggregate()
            .match({user:new Types.ObjectId(user), status:{$ne:"unread"}})
            .lookup({from:"books", localField:"book", foreignField:"_id", as:"bookInfo"})
            .unwind({path:"$bookInfo"})
            .lookup({from:"series", localField:"serie", foreignField:"_id", as:"serieInfo"})
            .unwind({path:"$serieInfo"});
    }

    createReadProgress(createReadProgress:CreateReadProgress):Promise<ReadProgress> {
        return this.readProgressModel.create(createReadProgress);
    }

    modifyReadProgress(id:Types.ObjectId, updateReadProgress:UpdateReadProgress):Promise<ReadProgress | null> {
        const {time, ...moreProgress} = updateReadProgress;

        let query:QueryOptions<ReadProgress> = {$set:{...moreProgress}};

        if (time) {
            query = {...query, $inc:{time:time}};
        }

        return this.readProgressModel.findByIdAndUpdate(id, query, {new:true});
    }

    async getSeriesProgress(user:Types.ObjectId):Promise<Types.ObjectId[]> {
        const foundArray = await this.readProgressModel.aggregate()
            .match({user:new Types.ObjectId(user)})
            .group({_id:null, "series":{$addToSet:"$serie"}});

        if (foundArray && foundArray.length > 0 && foundArray[0].series) {
            return foundArray[0].series;
        }
        return [];
    }

    async deleteReadProgress(id:Types.ObjectId, user:Types.ObjectId) {
        return this.readProgressModel.findOneAndDelete({_id:id, user});
    }
}
