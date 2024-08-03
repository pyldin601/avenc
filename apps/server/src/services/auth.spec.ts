import RedisMemoryServer from "redis-memory-server";
import { AuthService, RedisBackedAuthService } from "./auth";
import Redis from "ioredis";
import { describe } from "node:test";
import jwt from "jsonwebtoken";

const redisServer = new RedisMemoryServer();

let redisClient: Redis;
let authService: AuthService;

beforeEach(async () => {
  const redisPort = await redisServer.getPort();
  const redisHost = await redisServer.getHost();

  redisClient = new Redis(redisPort, redisHost);

  authService = new RedisBackedAuthService(redisClient, {
    refreshTokenTtl: "10m",
    accessTokenTtl: "5m",
    jwtSecretKey: "jwtSecretKey",
  });
});

afterEach(async () => {
  redisClient.disconnect();
  await redisServer.stop();
});

describe("sign up", () => {
  it("returns user ID if user successfully signed up", async () => {
    await expect(authService.signUpWithEmailAndPassword("test@email.com", "testPassword")).resolves.toEqual({
      value: expect.any(String),
    });
  });

  it("fails if user with given email already exists", async () => {
    await authService.signUpWithEmailAndPassword("test@email.com", "testPassword");

    await expect(authService.signUpWithEmailAndPassword("test@email.com", "testPassword2")).rejects.toThrow(
      "User with given email already exists",
    );
  });
});

describe("login", () => {
  it("returns refresh and access tokens if user successfully logged in", async () => {
    await authService.signUpWithEmailAndPassword("test@email.com", "testPassword");

    await expect(authService.loginByEmailAndPassword("test@email.com", "testPassword")).resolves.toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it("fails if email or password is not valid", async () => {
    await authService.signUpWithEmailAndPassword("test@email.com", "testPassword");

    await expect(authService.loginByEmailAndPassword("wrong@email.com", "testPassword")).rejects.toThrow(
      "Incorrect email or password",
    );
    await expect(authService.loginByEmailAndPassword("test@email.com", "wrongPassword")).rejects.toThrow(
      "Incorrect email or password",
    );
  });
});

describe("access token", () => {
  it("contains user ID in access token", async () => {
    const userId = await authService.signUpWithEmailAndPassword("test@email.com", "testPassword");
    const { accessToken } = await authService.loginByEmailAndPassword("test@email.com", "testPassword");

    await expect(authService.getUserId(accessToken)).resolves.toEqual(userId);
  });

  it("contains correct expiration date", async () => {
    await authService.signUpWithEmailAndPassword("test@email.com", "testPassword");
    const { accessToken } = await authService.loginByEmailAndPassword("test@email.com", "testPassword");

    const payload = jwt.decode(accessToken) as { iat: number; exp: number };

    expect(payload.exp - payload.iat).toBe(300);
  });
});

describe("refresh token", () => {
  it("returns new access and refresh token on refreshing token", async () => {
    const userId = await authService.signUpWithEmailAndPassword("test@email.com", "testPassword");
    const { refreshToken } = await authService.loginByEmailAndPassword("test@email.com", "testPassword");

    const { accessToken } = await authService.refreshAuthToken(refreshToken);

    expect(authService.getUserId(accessToken)).resolves.toEqual(userId);
  });
});
