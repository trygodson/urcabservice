import { NestFactory } from '@nestjs/core';
import { DriverAppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from '@urcab-workspace/shared';
// import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
// import MockDate from 'mockdate';

// MockDate.set('2025-07-28T10:59:59');

async function bootstrap() {
  const app = await NestFactory.create(DriverAppModule);

  app.enableCors();
  const config = new DocumentBuilder()
    .setTitle('UrCab Driver Service')
    .setDescription('Get Away')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useLogger(app.get(Logger));
  // app.use(cookieParser());
  const configService = app.get(ConfigService);
  SwaggerModule.setup('swagger', app, document);
  await app.listen(process.env.PORT || configService.get('DRIVER_HTTP_PORT'));
  // await app.listen(3012);
}
bootstrap();
