import * as argon2 from "argon2";

export function hashData(data: string) {
    return argon2.hash(data);
}

export async function checkPasswords(hashedPass:string, pass:string):Promise<boolean> {
    return argon2.verify(hashedPass, pass);
}