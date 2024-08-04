import { HashUtils, RedisKeys } from "@avenc/server-libs";
import { randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import Redis from "ioredis";

const REFRESH_TOKEN_BYTES_SIZE = 256;

const PASSWORD_HASH_FIELD = "password_hash";
const EMAIL_FIELD = "email";

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

export interface UserId {
  value: string;
}

export interface AuthServiceConfig {
  jwtSecretKey: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
  resetPasswordTokenTtl: number;
}

export abstract class AuthService {
  abstract signUpWithEmailAndPassword(email: string, password: string): Promise<UserId>;
  abstract loginByEmailAndPassword(email: string, password: string): Promise<AuthToken>;
  abstract refreshAuthToken(refreshToken: string): Promise<AuthToken>;
  abstract requestPasswordReset(email: string): Promise<string>;
  abstract resetPassword(resetToken: string, newPassword: string): Promise<void>;
  abstract logout(refreshToken: string): Promise<void>;
  abstract logoutEverywhere(refreshToken: string): Promise<void>;
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
    await this.redisClient.hmset(redisKey, EMAIL_FIELD, email, PASSWORD_HASH_FIELD, passwordHash);

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

    // Check if the users active
    const userKey = RedisKeys.USER_KEY.replace("{userId}", maybeUserId);
    const [passwordHash] = await this.redisClient.hmget(userKey, PASSWORD_HASH_FIELD);

    if (!passwordHash) {
      throw new Error("Incorrect email or password");
    }

    // Check password
    if (!(await HashUtils.verifyPassword(passwordHash, password))) {
      throw new Error("Incorrect email or password");
    }

    // Generate access and refresh tokens
    const accessToken = this.makeAccessToken(maybeUserId);
    const refreshToken = this.makeRefreshToken();

    await this.storeRefreshToken(maybeUserId, refreshToken);

    const sessionKey = RedisKeys.SESSIONS_KEY.replace("{userId}", maybeUserId);
    await this.redisClient.zadd(sessionKey, Date.now(), refreshToken);

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

    const sessionKey = RedisKeys.SESSIONS_KEY.replace("{userId}", userId);
    await this.redisClient.zadd(sessionKey, Date.now(), refreshToken);
    await this.redisClient.zrem(sessionKey, oldRefreshToken);

    return { accessToken, refreshToken };
  }

  public async requestPasswordReset(email: string): Promise<string> {
    const resetToken = randomBytes(256).toString("base64");
    const resetTokenKey = RedisKeys.RESET_TOKEN_KEY.replace("{resetToken}", resetToken);

    // Check user ID
    const emailHash = HashUtils.hashEmail(email);
    const emailHashKey = RedisKeys.EMAIL_HASH_KEY.replace("{emailHash}", emailHash);
    const maybeUserId = await this.redisClient.get(emailHashKey);

    // Fail if user with given email does not exist
    if (maybeUserId === null) {
      throw new Error("User with given email does not exist");
    }

    await this.redisClient.set(resetTokenKey, maybeUserId, "PX", this.config.resetPasswordTokenTtl);

    return resetToken;
  }

  public async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const resetTokenKey = RedisKeys.RESET_TOKEN_KEY.replace("{resetToken}", resetToken);
    const maybeUserId = await this.redisClient.get(resetTokenKey);

    // Fail if user with given email does not exist
    if (maybeUserId === null) {
      throw new Error("Incorrect reset password token");
    }

    const userKey = RedisKeys.USER_KEY.replace("{userId}", maybeUserId);
    const newPasswordHash = await HashUtils.hashPassword(newPassword);

    if (await this.redisClient.exists(userKey)) {
      this.redisClient.hmset(userKey, PASSWORD_HASH_FIELD, newPasswordHash);
    }
  }

  public async logout(refreshToken: string): Promise<void> {
    const refreshTokenKey = RedisKeys.REFRESH_TOKEN_KEY.replace("{refreshToken}", refreshToken);
    const userId = await this.redisClient.get(refreshTokenKey);

    if (!userId) {
      return;
    }

    await this.redisClient.del(refreshTokenKey);

    const sessionKey = RedisKeys.SESSIONS_KEY.replace("{userId}", userId);
    await this.redisClient.zrem(sessionKey, refreshToken);
  }

  public async logoutEverywhere(refreshToken: string): Promise<void> {
    const refreshTokenKey = RedisKeys.REFRESH_TOKEN_KEY.replace("{refreshToken}", refreshToken);
    const userId = await this.redisClient.get(refreshTokenKey);

    if (!userId) {
      return;
    }

    const sessionsKey = RedisKeys.SESSIONS_KEY.replace("{userId}", userId);
    const sessions = await this.redisClient.zrange(sessionsKey, 0, -1);

    await Promise.all(sessions.map((token) => this.logout(token)));
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
      expiresIn: this.config.accessTokenTtl / 1000,
    });
  }

  private makeRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES_SIZE).toString("base64");
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenKey = RedisKeys.REFRESH_TOKEN_KEY.replace("{refreshToken}", refreshToken);

    this.redisClient.set(refreshTokenKey, userId, "PX", this.config.refreshTokenTtl);
  }
}
