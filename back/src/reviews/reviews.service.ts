import {Injectable, ForbiddenException} from "@nestjs/common";
import {Model, Types} from "mongoose";
import {InjectModel} from "@nestjs/mongoose";
import {Review} from "./schemas/review.schema";

@Injectable()
export class ReviewsService {
    constructor(@InjectModel(Review.name) private readonly reviewModel:Model<Review>) {}

    create(review:Review) {
        return this.reviewModel.create(review);
    }

    findSerieReviews(serie:Types.ObjectId) {
        return this.reviewModel.find({serie});
    }

    async getSerieDifficulty(serie:Types.ObjectId) {
        const pipe = await this.reviewModel.aggregate()
            .match({serie:new Types.ObjectId(serie)})
            .addFields({
                "peso":{
                    $switch:{
                        branches:[
                            {case: {$eq: ["$userLevel", "N1+"]}, then: 1.25},
                            {case: {$eq: ["$userLevel", "N1"]}, then: 1},
                            {case: {$eq: ["$userLevel", "N2"]}, then: 0.9},
                            {case: {$eq: ["$userLevel", "N3"]}, then: 0.75},
                            {case: {$eq: ["$userLevel", "N4"]}, then: 0.6},
                            {case: {$eq: ["$userLevel", "N5"]}, then: 0.5},
                            {case: {$eq: ["$userLevel", "Principiante"]}, then: 0.4}
                        ],
                        default:1
                    }
                }
            })
            .group({
                _id:null,
                totalWeightedRating:{
                    $sum:{$multiply:["$difficulty", "$peso"]}
                },
                totalReviews:{$sum:1}
            }).project({
                averageWeightedRating:{
                    $divide:[
                        "$totalWeightedRating", {
                            $multiply:["$totalReviews", 0.5]
                        }
                    ]
                }
            });
        if (pipe.length > 0) {
            return pipe[0].averageWeightedRating;
        }
    }

    async removeReview(userId:Types.ObjectId, id:Types.ObjectId) {
        const foundReview = await this.reviewModel.findOne({_id:id, user:userId});

        if (!foundReview) {
            throw new ForbiddenException();
        }

        return this.reviewModel.findByIdAndDelete(id);
    }
}
