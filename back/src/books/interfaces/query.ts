import {Types} from "mongoose";
import {Book} from "../schemas/book.schema";
import {UpdateBookDto} from "../dto/update-book.dto";

export interface SearchQuery {
    name?:string;

    serie?:Types.ObjectId;

    sort?:string;

    status?:"unread" | "reading" | "readlist" | "completed";

    limit?:number;

    page?:number;
}

export interface UserBook extends Book {
    status:"unread" | "reading" | "readlist" | "completed"
}

export interface UpdateBook extends UpdateBookDto {
    lastModifiedDate?:Date
}