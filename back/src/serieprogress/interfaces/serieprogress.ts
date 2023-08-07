import {Types} from "mongoose";
import {Book} from "../../books/schemas/book.schema";
import {SerieProgress} from "../schemas/serieprogress.schema";

export interface CreateOrModifySerieProgress {
    serie:Types.ObjectId;

    user:Types.ObjectId;

    book:Types.ObjectId;

    action:"add" | "remove"
}

export interface FullSerieProgress extends SerieProgress {
    serieBooks:Book[]
}