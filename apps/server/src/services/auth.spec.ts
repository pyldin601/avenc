import RedisMemoryServer from "redis-memory-server";
import { AuthService, RedisBackedAuthService } from "./auth";
import Redis from "ioredis";

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

describe("Sign Up", () => {
  it("Should return user ID if user successfully signed up", async () => {
    const userId = await authService.signUpWithEmailAndPassword("test@email.com", "testPassword");

    expect(userId).toEqual({
      value: expect.any(String),
    });
  });
});
