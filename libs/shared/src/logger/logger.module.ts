import { Module } from '@nestjs/common';
import { LoggerModule as LLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LLoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        },
      },
    }),
  ],
})
export class LoggerModule {}
