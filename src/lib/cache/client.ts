import Redis from "ioredis";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";

type RedisLike = Pick<Redis, "get" | "setex" | "del">;

let redisInstance: RedisLike | null = null;

const redisNoopClient: RedisLike = {
  async get() {
    return null;
  },
  async setex() {
    return "OK";
  },
  async del() {
    return 0;
  },
};

function createRedisClient(): RedisLike {
  if (!env.REDIS_URL) {
    logger.warn("redis.client_disabled", {
      reason: "REDIS_URL not configured",
    });
    return redisNoopClient;
  }

  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

  client.on("error", (error) => {
    logger.warn("redis.client_error", { error });
  });

  return client;
}

export const redis: RedisLike = new Proxy(redisNoopClient, {
  get(_target, property, receiver) {
    redisInstance ??= createRedisClient();
    return Reflect.get(redisInstance, property, receiver);
  },
});
