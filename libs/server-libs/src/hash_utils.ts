import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export function hashEmail(email: string): string {
  const hash = createHash("sha256");
  hash.update(email);
  return hash.digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;

  return `${buf.toString("hex")}.${salt}`;
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  const [hashedPassword, salt] = passwordHash.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(password, salt, 64)) as Buffer;

  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}
