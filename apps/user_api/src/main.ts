import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from '@urcab-workspace/shared';
import * as compression from 'compression';

// MockDate.set('2025-07-28T10:59:59');
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const config = new DocumentBuilder()
    .setTitle('UrCab Passenger Service')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.use(compression());
  const configService = app.get(ConfigService);
  SwaggerModule.setup('swagger', app, document);
  console.log('====== Listening on PORT ' + process.env.HTTP_PORT || configService.get('HTTP_PORT') + ' =======');
  await app.listen(process.env.PORT || configService.get('HTTP_PORT'));
}
bootstrap();
