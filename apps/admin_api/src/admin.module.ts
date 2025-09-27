import { Module } from '@nestjs/common';
import { DatabaseModule, AppConfig, LoggerModule } from '@urcab-workspace/shared';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthModule } from './auth';
import { AdminDriversModule } from './drivers/adminDrivers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [AppConfig],
    }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow('JWT_ASECRET'),
          signOptions: {
            expiresIn: `${configService.getOrThrow('JWT_EXPIRATION')}s`,
          },
        };
      },
      inject: [ConfigService],
    }),

    DatabaseModule,
    LoggerModule,

    HttpModule,
    ScheduleModule.forRoot(),
    // BullModule.registerQueue(
    //   {
    //     name: CONFIG_NAMES.SINGLE_ELECTION_QUEUE_JOB_NOTIFICATION,
    //   },
    //   {
    //     name: CONFIG_NAMES.STAGED_ELECTION_QUEUE_JOB_NOTIFICATION,
    //   },
    // ),
    AdminAuthModule,
    AdminDriversModule,
  ],

  // providers: [AdminService],
})
export class AdminModule {}
