import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/constants';
import { Maybe } from 'true-myth';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async setWithExpiry(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redisClient.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<Maybe<string>> {
    const value = await this.redisClient.get(key);
    return Maybe.of(value);
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}
