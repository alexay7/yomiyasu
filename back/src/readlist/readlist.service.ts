import {Injectable} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {ReadList} from "./schemas/readlist.schema";
import {Model, Types} from "mongoose";
import {CreateReadList} from "./interfaces/readlist.interface";

@Injectable()
export class ReadlistService {
    constructor(
        @InjectModel(ReadList.name) private readonly readListModel: Model<ReadList>
    ) {}

    create(createReadList: CreateReadList) {
        return this.readListModel.create(createReadList);
    }

    findSerieInReadList(user:Types.ObjectId, serie:Types.ObjectId) {
        return this.readListModel.findOne({user, serie});
    }

    async isInReadlist(user:Types.ObjectId, serie:Types.ObjectId) {
        return (await this.readListModel.count({user, serie})) > 0;
    }

    getUserReadListSeries(user: Types.ObjectId) {
        return this.readListModel
            .aggregate()
            .match({user: new Types.ObjectId(user)})
            .lookup({
                from: "series",
                localField: "serie",
                foreignField: "_id",
                as: "serieInfo"
            });
    }

    removeSerieFromUserList(user: Types.ObjectId, serie: Types.ObjectId) {
        return this.readListModel.deleteOne({user, serie});
    }

    removeSerieWithId(id:Types.ObjectId) {
        return this.readListModel.findByIdAndDelete(id);
    }
}
