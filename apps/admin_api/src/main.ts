import { NestFactory } from '@nestjs/core';
import { AdminModule } from './admin.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from '@urcab-workspace/shared';
// import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AdminModule);

  app.enableCors();
  const config = new DocumentBuilder()
    .setTitle('Admin Side')
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
  // await app.listen(process.env.PORT || configService.get('HTTP_PORT'));
  await app.listen(3013);
}
bootstrap();
