import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from 'src/config';
import { REDIS_CLIENT } from 'src/constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        return new Redis({
          host: config.redisConfig.host,
          port: config.redisConfig.port,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
