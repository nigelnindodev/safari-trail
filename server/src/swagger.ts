import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from './constants';

export default function configSwagger(app: INestApplication<any>) {
  const config = new DocumentBuilder()
    .setTitle('Nexus')
    .setDescription('The Nexus API specification')
    .setVersion('1.0')
    .addTag('nexus')
    .addBearerAuth()
    .addCookieAuth(AUTH_COOKIE_NAME)
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
}
