import { Types } from "mongoose";

export interface createSeriesProgress{
    user:Types.ObjectId;

    serie:string;   
}