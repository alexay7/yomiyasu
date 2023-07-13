export interface LoggedUser {
    _id:string;

    username:string

    email:string
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