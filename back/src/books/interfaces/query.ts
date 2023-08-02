import {Types} from "mongoose";
import {Book} from "../schemas/book.schema";
import {UpdateBookDto} from "../dto/update-book.dto";
import {ReadProgress} from "../../readprogress/schemas/readprogress.schema";

export interface SearchQuery {
    name?:string;

    serie?:Types.ObjectId;

    sort?:string;

    status?:"unread" | "reading" | "readlist" | "completed";

    limit?:number;

    page?:number;
}

export interface UserBook extends Book {
    status:"unread" | "reading" | "readlist" | "completed",
    lastProgress:ReadProgress
}

export interface UpdateBook extends UpdateBookDto {
    lastModifiedDate?:Date
}