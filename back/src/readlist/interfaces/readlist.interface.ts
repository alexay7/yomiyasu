import {Types} from "mongoose";

export interface CreateReadList {
    book: Types.ObjectId;

    user: Types.ObjectId;
}
