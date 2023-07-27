import {Book} from "./book";
import {Serie} from "./serie";

export interface LoggedUser {
    _id:string;

    username:string;

    email:string;

    admin:boolean;
}

export interface RegisterUser {
    username:string;

    email:string;

    password:string;
}

export interface LoginUser {
    usernameOrEmail:string;

    password:string;
}

export interface UpdateProfile {
    newUsername?:string;

    oldPassword?:string;

    newPassword?:string;
}

export interface UserProgress {
    _id:string;
    startDate:Date;
    time:number;
    currentPage:number;
    status:"completed" | "reading" | "unread";
    lastUpdateDate?:Date;
    endDate?:Date;
    bookInfo:Book;
    serieInfo:Serie;
}