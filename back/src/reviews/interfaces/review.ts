import {Review} from "../schemas/review.schema";

export interface ParsedReview extends Review {
    name:string;
}