import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig, DatabaseModule, getRedisConfig, LoggerModule } from '@urcab-workspace/shared';
import { FirebaseModule } from 'nestjs-firebase';
import { UserModule } from './modules/user';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { RidesModule } from './modules/rides/rides.modules';
import { DriverAuthModule } from './driver-modules/auth';
import { DriverLocationModule } from './driver-modules/driver-location/driverLocation.module';
import { DriverModule } from './driver-modules/driver/driver.module';
import { DriverRideModule } from './driver-modules/driver-ride/driverRide.module';
import { DriverVehicleModule } from './driver-modules/driver-vehicle/driverVehicle.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { UserVerificationModule } from './modules/user-verification/userVerification.module';
// import { BullBoardModule } from '@bull-board/nestjs';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [AppConfig],
    }),
    FirebaseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          googleApplicationCredential: {
            clientEmail: configService.getOrThrow('FIREBASE_CLIENT_EMAIL'),
            privateKey: configService.getOrThrow('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
            projectId: configService.getOrThrow('FIREBASE_PROJECT_ID'),
          },
          databaseURL: configService.getOrThrow('FIREBASE_DATABASE_URL'),
          projectId: configService.getOrThrow('FIREBASE_PROJECT_ID'),
        };
      },
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      useFactory: () => getRedisConfig(),
    }),

    DatabaseModule,
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '_',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    LoggerModule,
    AuthModule,

    DriverAuthModule,

    UserModule,
    RidesModule,

    DriverModule,
    DriverRideModule,
    DriverVehicleModule,
    DriverLocationModule,
    UserVerificationModule,
  ],
  // providers: [TransactionService],
})
export class AppModule {}
