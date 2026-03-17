import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfigModule, AppConfigService } from './config';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis';
import { SecurityModule } from './security/security.module';
import { pinoLoggerConfig } from './common/logger';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot(pinoLoggerConfig),
    RedisModule,
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) =>
        configService.typeOrmConfig,
    }),
    UsersModule,
    AuthModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
