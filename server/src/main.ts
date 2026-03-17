import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppConfigService } from './config';
import * as cookieParser from 'cookie-parser';
import configSwagger from './swagger';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const httpApp = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = httpApp.get(Logger);
  httpApp.useLogger(logger);

  httpApp.enableCors({
    origin: 'http://localhost:3000', // new env var for this
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  });

  configSwagger(httpApp);

  httpApp.use(cookieParser());
  httpApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // let's bullet proof this after testing
      transform: true,
    }),
  );

  const configService = httpApp.get(AppConfigService);
  const httpPort = configService.httpPort;
  await httpApp.listen(httpPort);
  logger.log('HTTP application started', { port: httpPort });

  const redisMicroservice =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.REDIS,
      options: configService.redisConfig,
    });
  await redisMicroservice.listen();
  logger.log('Redis microservice started');
}
void bootstrap();
