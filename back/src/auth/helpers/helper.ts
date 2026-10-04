import * as argon2 from "argon2";

export function hashData(data: string) {
    return argon2.hash(data);
}

export async function checkPasswords(hashedPass:string, pass:string):Promise<boolean> {
    return argon2.verify(hashedPass, pass);
}

/**
 * Convierte una duración estilo jsonwebtoken ("30d", "3650d", "12h"...) a
 * milisegundos para poder alinear la expiración de las cookies con la del JWT.
 */
export function durationToMs(duration: string): number {
    const match = /^(\d+)([smhdwy]?)$/.exec(duration.trim());

    if (!match) return 0;

    const value = parseInt(match[1], 10);

    const factors: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
        y: 365 * 24 * 60 * 60 * 1000
    };

    return value * factors[match[2] || "s"];
}
