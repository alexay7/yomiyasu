import {Types} from "mongoose";

export interface CreateReadList {
    serie: Types.ObjectId;

    user: Types.ObjectId;
}
