import Redis from "ioredis";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";

let redisInstance: Redis | null = null;

function createRedisClient() {
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

export const redis = new Proxy({} as Redis, {
  get(_target, property, receiver) {
    redisInstance ??= createRedisClient();
    return Reflect.get(redisInstance, property, receiver);
  },
});
