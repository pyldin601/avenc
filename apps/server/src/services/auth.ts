import { HashUtils, RedisKeys } from "@avenc/server-libs";
import { randomUUID } from "node:crypto";
import Redis from "ioredis";

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

export interface UserId {
  value: string;
}

export abstract class AuthService {
  abstract signUpWithEmailAndPassword(email: string, password: string): Promise<UserId>;
  abstract loginByEmailAndPassword(email: string, password: string): Promise<AuthToken>;
  abstract refreshAuthToken(refreshToken: string): Promise<AuthToken>;
  abstract requestPasswordReset(email: string): Promise<void>;
  abstract resetPassword(resetToken: string, newPassword: string): Promise<void>;
  abstract logout(accessToken: string): Promise<void>;
  abstract logoutEverywhere(): Promise<void>;
  abstract getUserId(accessToken: string): Promise<UserId>;
}

export class RedisBackedAuthService implements AuthService {
  constructor(private readonly redisClient: Redis) {}

  public async signUpWithEmailAndPassword(email: string, password: string): Promise<UserId> {
    const userId = randomUUID();

    const emailHash = HashUtils.hashEmail(email);
    const emailHashKey = RedisKeys.EMAIL_HASH_KEY.replace("{emailHash}", emailHash);
    const result = await this.redisClient.set(emailHashKey, userId, "NX");

    if (result === null) {
      throw new Error("User with given email already exists");
    }

    const passwordHash = await HashUtils.hashPassword(password);

    const redisKey = RedisKeys.USER_KEY.replace("{userId}", userId);
    await this.redisClient.hmset(redisKey, "email", email, "password_hash", passwordHash);

    return { value: userId };
  }
}
