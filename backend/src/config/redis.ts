import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => console.error("Redis connection error", err));
