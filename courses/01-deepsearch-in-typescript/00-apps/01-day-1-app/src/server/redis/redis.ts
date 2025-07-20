import { env } from "~/env";
import Redis from "ioredis";

export const redis = new Redis(env.REDIS_URL);

const CACHE_EXPIRY_SECONDS = env.CACHE_EXPIRY_SECONDS;
const CACHE_KEY_SEPARATOR = ":";

export const cacheWithRedis = <TFunc extends (...args: any[]) => Promise<any>>(
  keyPrefix: string,
  fn: TFunc,
): TFunc => {
  return (async (...args: Parameters<TFunc>) => {
    const key = `${keyPrefix}${CACHE_KEY_SEPARATOR}${JSON.stringify(args)}`;
    const cachedResult = await redis.get(key);
    if (cachedResult) {
      console.log(`Cache hit for ${key}`);
      return JSON.parse(cachedResult);
    }

    const result = await fn(...args);
    await redis.set(key, JSON.stringify(result), "EX", CACHE_EXPIRY_SECONDS);
    return result;
  }) as TFunc;
};
