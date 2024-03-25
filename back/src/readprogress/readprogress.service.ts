import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
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

    async modifyReadProgress(id:Types.ObjectId, updateReadProgress:UpdateReadProgress, user?:Types.ObjectId):Promise<ReadProgress | null> {
        if (user) {
            const foundProgress = await this.readProgressModel.findById(id);

            if (!foundProgress?.user.equals(user)) {
                throw new ForbiddenException();
            }
        }

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
            await this.seriesProgressService.createOrIncreaseBooks({book:foundProgress.book, user, action:"remove", serie:foundProgress.serie}, foundProgress.variant);
        }

        return this.readProgressModel.findOneAndDelete({_id:id, user});
    }

    async modifyWholeSerie(serie:Types.ObjectId, user:Types.ObjectId, paused:boolean) {
        return this.readProgressModel.updateMany({serie:new Types.ObjectId(serie), user:new Types.ObjectId(user)}, {paused});
    }

    async getReadingSeries(user:Types.ObjectId) {
        return this.readProgressModel.find({user, status:"reading"});
    }

    async getUserStats(user:Types.ObjectId) {
        const res = await this.readProgressModel.aggregate()
            .match({user:new Types.ObjectId(user), status:{$ne:"unread"}})
            .group({
                _id: null,
                totalMangaBooks: {
                    $sum: {
                        $cond: [
                            {$and: [{$ne: ["$status", "unread"]}, {$eq: ["$variant", "manga"]}]},
                            1,
                            0
                        ]
                    }
                },
                totalNovelaBooks: {
                    $sum: {
                        $cond: [
                            {$and: [{$ne: ["$status", "unread"]}, {$eq: ["$variant", "novela"]}]},
                            1,
                            0
                        ]
                    }
                },
                mangaSeries: {
                    $addToSet: {
                        $cond: [
                            {$eq: ["$variant", "manga"]},
                            "$series",
                            null
                        ]
                    }
                },
                novelaSeries: {
                    $addToSet: {
                        $cond: [
                            {$eq: ["$variant", "novela"]},
                            "$series",
                            null
                        ]
                    }
                },
                totalPagesRead: {
                    $sum: "$currentPage"
                },
                totalTimeRead: {
                    $sum: "$time"
                },
                totalCharacters: {
                    $sum: "$characters"
                }
            })
            .project(
                {
                    _id: 0,
                    totalMangaBooks: 1,
                    totalNovelaBooks: 1,
                    totalMangaSeries: {$size: "$mangaSeries"},
                    totalNovelaSeries: {$size: "$novelaSeries"},
                    totalPagesRead: 1,
                    totalCharacters:1,
                    totalTimeRead: {
                        $divide: ["$totalTimeRead", 60] // Convert seconds to minutes
                    }
                }
            );

        if (res) {
            return res[0];
        }
        return {};
    }

    async getGraphStats(user:Types.ObjectId) {
        const mangaRes = (await this.readProgressModel.aggregate()
            .match({user:new Types.ObjectId(user), time:{$gt:0}, variant:"manga"})
            .group({
                _id: {
                    year: {$year: "$endDate"},
                    month: {$month: "$endDate"}
                },
                totalCharacters: {$sum: "$characters"},
                totalTime: {$sum: "$time"}
            })
            .addFields(
                {
                    meanReadSpeed: {
                        $cond: [
                            {$gt: ["$totalTime", 0]},
                            {$multiply:[{$divide: ["$totalCharacters", "$totalTime"]}, 3600]},
                            0 // Avoid division by zero, set meanReadSpeed to 0
                        ]
                    }
                }
            )
            .addFields({
                totalHours: {
                    $cond: [
                        {$gt: ["$totalTime", 0]},
                        {$divide: ["$totalTime", 3600]}, // 3600 seconds in an hour
                        0 // Avoid division by zero, set totalHours to 0
                    ]
                }
            })
            .sort(
                {
                    "_id.year": 1,
                    "_id.month": 1
                }
            )).filter(x=>x._id.year !== null);

        const novelaRes = (await this.readProgressModel.aggregate()
            .match({user:new Types.ObjectId(user), time:{$gt:0}, variant:"novela"})
            .group({
                _id: {
                    year: {$year: "$endDate"},
                    month: {$month: "$endDate"}
                },
                totalCharacters: {$sum: "$characters"},
                totalTime: {$sum: "$time"}
            })
            .addFields(
                {
                    meanReadSpeed: {
                        $cond: [
                            {$gt: ["$totalTime", 0]},
                            {$multiply:[{$divide: ["$totalCharacters", "$totalTime"]}, 3600]},
                            0 // Avoid division by zero, set meanReadSpeed to 0
                        ]
                    }
                }
            )
            .addFields({
                totalHours: {
                    $cond: [
                        {$gt: ["$totalTime", 0]},
                        {$divide: ["$totalTime", 3600]}, // 3600 seconds in an hour
                        0 // Avoid division by zero, set totalHours to 0
                    ]
                }
            })
            .sort(
                {
                    "_id.year": 1,
                    "_id.month": 1
                }
            )).filter(x=>x._id.year !== null);

        if (mangaRes.length > 0 || novelaRes.length > 0) {
            return {manga:mangaRes, novela:novelaRes};
        }
        return {};
    }

    async getSerieSpeed(user:Types.ObjectId, serie:Types.ObjectId) {
        const res = await this.readProgressModel.aggregate()
            .match({user:new Types.ObjectId(user), time:{$gt:0}, characters:{$gt:0}, serie:new Types.ObjectId(serie)})
            .addFields(
                {
                    meanReadSpeed: {
                        $multiply:[{$divide: ["$characters", "$time"]}, 3600]
                    }
                }
            )
            .sort({endDate:1});
        return res;
    }

    async getBookProgresses(user:Types.ObjectId, book:Types.ObjectId) {
        return this.readProgressModel.find({user, book});
    }

    async getDayLogs(user:Types.ObjectId, year:number, month:number, day:number) {
        const result = this.readProgressModel.aggregate([
            {
                $match: {
                    user:new Types.ObjectId(user)
                }
            },
            {
                $addFields: {
                    day: {$dayOfMonth: "$lastUpdateDate"},
                    month: {$month: "$lastUpdateDate"},
                    year: {$year: "$lastUpdateDate"}
                }
            },
            {
                $match: {
                    day: day,
                    month: month,
                    year: year
                }
            }
        ]);

        result.lookup({from:"books", localField:"book", foreignField:"_id", as:"bookInfo"})
            .unwind({path:"$bookInfo"})
            .lookup({from:"series", localField:"serie", foreignField:"_id", as:"serieInfo"})
            .unwind({path:"$serieInfo"});

        return result;
    }

    async getMonthStreak(user:Types.ObjectId, year:number, month:number) {
        const startOfMonth = new Date(year, month);
        startOfMonth.setDate(1);
        const endOfMonth = new Date(year, month);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);

        const aggregationResult = await this.readProgressModel.aggregate([
            {
                $match: {
                    user:new Types.ObjectId(user),
                    lastUpdateDate: {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    }
                }
            },
            {
                $project: {
                    dayOfMonth: {$dayOfMonth: "$lastUpdateDate"}
                }
            },
            {
                $group: {
                    _id: "$dayOfMonth",
                    count: {$sum: 1}
                }
            }
        ]);

        if (aggregationResult.length > 0) {
            return aggregationResult.map(({_id, count}) => ({
                dayOfMonth: _id,
                count
            })).sort((a, b) => a.dayOfMonth - b.dayOfMonth);
        } else {
            return [];
        }
    }
}
