import bcrypt from "bcryptjs";

const ROUNDS = 12;

export const DUMMY_PASSWORD_HASH =
  "$2b$12$t3ES2R/v.PI1AmMd7ukZE.9iCvZ7PQLTp5XpKQ8fCVnpx7kYiSkUO";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function isStrongAdminPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
