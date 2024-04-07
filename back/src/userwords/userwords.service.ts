import {Injectable} from "@nestjs/common";
import {Model, Types} from "mongoose";
import {UserWord, UserWords} from "./schemas/userwords.schema";
import {InjectModel} from "@nestjs/mongoose";

@Injectable()
export class UserwordsService {
    constructor(
        @InjectModel(UserWords.name)
        private readonly userWordsModel: Model<UserWords>
    ) {}

    async createOrUpdate(user:Types.ObjectId, newUserWord:UserWord):Promise<{modifiedCount:number}> {
        // If the word already exists, change nothing
        const exists = await this.userWordsModel.exists({user, "words.word":newUserWord.word});

        if (exists) return {modifiedCount:0};

        const wordWithDate = {...newUserWord, createdAt:new Date()};

        const result = await this.userWordsModel.updateOne(
            {user},
            {$push:{words:wordWithDate}},
            {upsert:true}
        );

        return {modifiedCount:result.modifiedCount + result.upsertedCount};
    }

    async findAll(user:Types.ObjectId, sortBy:string) {
        const document = await this.userWordsModel.findOne({user});

        const words = document?.words || [];

        if (sortBy === "frequency") {
            return words.sort((a, b) => b.frequency - a.frequency);
        } else if (sortBy === "!frequency") {
            return words.sort((a, b) => a.frequency - b.frequency);
        } else if (sortBy === "new") {
            return words.sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
        } else {
            return words.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
        }
    }

    remove(user:Types.ObjectId, word:string) {
        return this.userWordsModel.updateOne(
            {user},
            {$pull:{words:{word}}}
        );
    }
}
