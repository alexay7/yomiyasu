import {LoggedUser} from "./user";

export interface AuthResponse {
    status:string;

    uuid:string;

    user:LoggedUser;
}

export interface RefreshResponse {
    status:string;

    uuid:string;
}