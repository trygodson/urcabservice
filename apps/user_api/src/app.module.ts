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
        // return {
        //   googleApplicationCredential: {
        //     type: 'service_account',
        //     project_id: configService.getOrThrow('FIREBASE_PROJECT_ID'),
        //     private_key_id: configService.getOrThrow('FIREBASE_PRIVATE_KEY_ID'),
        //     private_key: configService.getOrThrow('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
        //     client_email: configService.getOrThrow('FIREBASE_CLIENT_EMAIL'),
        //     client_id: configService.getOrThrow('FIREBASE_CLIENT_ID'),
        //     auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        //     token_uri: 'https://oauth2.googleapis.com/token',
        //     auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        //     client_x509_cert_url: configService.getOrThrow('FIREBASE_CLIENT_CERT_URL'),
        //   },
        //   databaseURL: configService.getOrThrow('FIREBASE_DATABASE_URL'),
        //   projectId: configService.getOrThrow('FIREBASE_PROJECT_ID'),
        // };
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
  ],
  // providers: [TransactionService],
})
export class AppModule {}
