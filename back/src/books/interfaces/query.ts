import { Types } from "mongoose";
import { Book } from "../schemas/book.schema";

export interface SearchQuery{
    name?:string;

    serie?:string;

    author?:string;

    sort?:string;

    status?:"UNREAD"|"READING"|"TOREAD"|"COMPLETED"
}

export interface UserBook extends Book{
    status:"NOT_READING"|"READING"|"TOREAD"|"COMPLETED"
}