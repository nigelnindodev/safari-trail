import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppConfigService } from 'src/config';
import { USER_SERVICE } from 'src/constants';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE,
        inject: [AppConfigService],
        useFactory: (configService: AppConfigService) => ({
          transport: Transport.REDIS,
          options: configService.redisConfig,
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class UsersClientModule {}
