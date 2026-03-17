import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AppService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AppService.name);
  }

  getHello(): string {
    this.logger.info(
      { endpoint: '/hello', method: 'GET' },
      'Health check endpoint called',
    );
    return 'Hello World!';
  }
}
