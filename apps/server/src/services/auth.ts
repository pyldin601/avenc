import { HashUtils, RedisKeys } from "@avenc/server-libs";
import { randomBytes, randomUUID } from "node:crypto";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import ms from "ms";
import { undefined } from "zod";

const REFRESH_TOKEN_BYTES_SIZE = 256;

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

export interface UserId {
  value: string;
}

export interface AuthServiceConfig {
  jwtSecretKey: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
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
  constructor(
    private readonly redisClient: Redis,
    private readonly config: AuthServiceConfig,
  ) {}

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

  public async loginByEmailAndPassword(email: string, password: string): Promise<AuthToken> {
    // Hash the email
    const emailHash = HashUtils.hashEmail(email);

    // Create a Redis key for storing the email hash
    const emailHashKey = RedisKeys.EMAIL_HASH_KEY.replace("{emailHash}", emailHash);

    // Get the user ID associated with the given email hash
    const maybeUserId = await this.redisClient.get(emailHashKey);

    if (maybeUserId === null) {
      throw new Error("Incorrect email or password");
    }

    // Check if the users active)
    const userKey = RedisKeys.USER_KEY.replace("{userId}", maybeUserId);
    const isActive = Boolean(await this.redisClient.exists(userKey));

    if (!isActive) {
      throw new Error("Incorrect email or password");
    }

    // Generate access and refresh tokens
    const accessToken = this.makeAccessToken(maybeUserId);
    const refreshToken = this.makeRefreshToken();

    await this.storeRefreshToken(maybeUserId, refreshToken);

    return { accessToken, refreshToken };
  }

  public async refreshAuthToken(oldRefreshToken: string): Promise<AuthToken> {
    const refreshTokenKey = RedisKeys.REFRESH_TOKEN_KEY.replace("{refreshToken}", oldRefreshToken);
    const userId = await this.redisClient.get(refreshTokenKey);

    if (!userId) {
      throw new Error("Incorrect refresh token");
    }

    // Check if the user is still active
    const userKey = RedisKeys.USER_KEY.replace("{userId}", userId);
    const isActive = Boolean(await this.redisClient.exists(userKey));

    if (!isActive) {
      throw new Error("Incorrect refresh token");
    }

    const accessToken = this.makeAccessToken(userId);
    const refreshToken = this.makeRefreshToken();

    await this.storeRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  public async requestPasswordReset(email: string): Promise<void> {
    throw new Error("Unimplemented");
  }

  public async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    throw new Error("Unimplemented");
  }

  public async logout(accessToken: string): Promise<void> {
    throw new Error("Unimplemented");
  }

  public async logoutEverywhere(): Promise<void> {
    throw new Error("Unimplemented");
  }

  public async getUserId(accessToken: string): Promise<UserId> {
    const payload = jwt.verify(accessToken, this.config.jwtSecretKey);
    if (typeof payload.sub !== "string") {
      throw new Error("Invalid token");
    }

    return { value: payload.sub };
  }

  private makeAccessToken(userId: string): string {
    return jwt.sign({ sub: userId }, this.config.jwtSecretKey, {
      expiresIn: this.config.accessTokenTtl,
    });
  }

  private makeRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES_SIZE).toString("base64");
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenTtlSeconds = ms(this.config.refreshTokenTtl) / 1000;
    const refreshTokenKey = RedisKeys.REFRESH_TOKEN_KEY.replace("{refreshToken}", refreshToken);

    this.redisClient.set(refreshTokenKey, userId, "EX", refreshTokenTtlSeconds);
  }
}
