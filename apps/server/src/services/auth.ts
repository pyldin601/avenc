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
    // Generate a unique user ID
    const userId = randomUUID();

    // Hash the email
    const emailHash = HashUtils.hashEmail(email);

    // Create a Redis key for storing the email hash
    const emailHashKey = RedisKeys.EMAIL_HASH_KEY.replace("{emailHash}", emailHash);

    // Attempt to set the email hash key with the user ID in Redis
    // The "NX" option ensures that the key is only set if it does not already exist
    const result = await this.redisClient.set(emailHashKey, userId, "NX");

    // If the result is null, the email already exists in Redis, indicating a duplicate registration
    if (result === null) {
      throw new Error("User with given email already exists");
    }

    // Hash the password using a secure hashing function
    const passwordHash = await HashUtils.hashPassword(password);

    // Create a Redis key for storing user details using the generated user ID
    const redisKey = RedisKeys.USER_KEY.replace("{userId}", userId);

    // Store the user's email and hashed password in a Redis hash
    await this.redisClient.hmset(redisKey, "email", email, "password_hash", passwordHash);

    // Return the user ID wrapped in an object
    return { value: userId };
  }
}
