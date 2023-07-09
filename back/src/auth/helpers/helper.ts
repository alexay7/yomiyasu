import * as argon2 from 'argon2';

export function hashData(data: string) {
  return argon2.hash(data);
}
