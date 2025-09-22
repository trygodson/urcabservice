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
        // return {
        //   googleApplicationCredential: {
        //     clientEmail: configServie.getOrThrow('FIREBASE_CLIENT_EMAIL'),
        //     privateKey:
        //       '-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDNC1fMXMrZt9BV\n+1FlpQhHG7rEiUeIqkBvp+gUmXXP5WQv3Jp4GERFemIA3kK1B3C+QyEHOmtkfZgB\naDHvDj+Sp/ybHlAGeYYn7zCSwJu/y3eppj5NpzTf9AOdHJOjiBbib7/11C4/ZjMZ\nYi+nNO3oqRq8wEnJ70khRRuYiQ0P5S4Dgm3Teu8TCXmtZW8U/v18S0DrC9mJ5aLE\nMpSGrhac2wTbgsbA1LyRjjRTcrwshaCWj5FC8ZGYFVt6bR/2AM/m8wtADG4H5gR7\n6bwstxFwaahafmjDQWx6wCTZ4WEAmEOnKWzEQhwhFWEH3KC3E9FnI9QepFtQqKJ+\n9etk8EzTAgMBAAECggEAM5K6zqg4TXKycC36VzqfTmNnIq/00icgdfUhpqzCuTvV\na0Rthe90nJUfuWAuHyJz9SclU5AaGviMFy6CAMLwso6WNt30+uvuFnVPHlpb0m32\n9zDdUuLPpdTWY9ogOG2uc93vxoFL8J5gE+5iVgg2HuMJ2pfy91u8ZSXgvwkZw/lJ\nUAAOnwFHk9g4fzpSfRM0Ld4rcHSGAoAdrk8oIQtzllk9R6pTxQ7mDEWEb6ZyPICm\nqUiQ/fGr0UJRFZYjqRx/yPZu+aFtSXSPvZCY0WahHX0xme0SVLI5xWrY5aYBPeTs\nKFDc5x3fsiN8ZZsbGJWmQxd6Gz0DeukQwvfX0af44QKBgQD7JY1JBbwiuK77D8yY\nxXUr1qh0qX1SAG4Nb3R+zo65+cWhUoJYhRuBwG+AQc+tnYSHhHdF4lE66eLG2pSf\nwmP4qTVh/8HGzvSMnNCAHBKRVKJ3B1NNTZVzVwUlc1syJdvyTu6PqyAoe++mEg34\nuK1kHFQlGbU9V9Jx7IWjmfpGBwKBgQDRAbfKLxcYD5ApZPYNy0G9QTZQiGAGVz2P\nRIQWlfZqFt0s2tIoyq8uGFEyV6ob/jfG+qAOJkDkxHc/9IdKGyJy5K/u8yGbr3Dr\n8TuM6lKWCQs6qBuygpWSReMnZgtTQkHoZz9RQ7RTrwmM2Xzk8GlNaaiHZ/flYZBe\n+cxcxDFv1QKBgQDAQCa/V1yFV8ra9WUxLTZcsJ2TcIs2Uo3sSv1qdMRdKQ5YR8jv\n6jT8RksUa0yHIqVo98Y2AOEdsByhDIHpKe1NVHpA4n97qMEbQo95AgRUq+0SINFr\nw5A8EsklugB9iu2rtzB3Wg/r7bOt9PQtCXHxyJ3BKMTMiIXYH67NZfln0QKBgQCM\n3UWLpRVBiCu3Wm5jeZxC+5Kp0GA3pdC9oIYN2uCLPAGxW4HNMF3FCWqgLWlfGIVr\nPDtnjeyqwqdEmYAdOBCNswfIWmFKVoIa4ykpnjwvFsVUsTyJoW1BeozQXvw/Dybw\nhbWtBZ6h0BT1sxd0DXxLSmzlZfMzy//LozxTQX+4SQKBgQCJstkpkpLln7RRLSFG\neM6SpPxV5DFyCqOo+ignv2gVN0N4wJS5gA6rwRB2q2m6UtPXx6tTOsC1CLAmzF7F\nNdL9/nHvcaIbua8HpwO1s1SnLYLRc6RY8Omq6b7vU1sLL7DdkCpQCIZWgv8v/YfM\niOciquGA4nmcFdlfUznhFI3oMQ==\n-----END PRIVATE KEY-----\n',
        //     projectId: configServie.getOrThrow('FIREBASE_PROJECT_ID'),
        //   },
        //   databaseURL: configServie.getOrThrow('FIREBASE_DATABASE_URL'),
        //   projectId: configServie.getOrThrow('FIREBASE_PROJECT_ID'),
        // };

        return {
          googleApplicationCredential: {
            type: 'service_account',
            project_id: configService.getOrThrow('FIREBASE_PROJECT_ID'),
            private_key_id: configService.getOrThrow('FIREBASE_PRIVATE_KEY_ID'),
            private_key: configService.getOrThrow('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
            client_email: configService.getOrThrow('FIREBASE_CLIENT_EMAIL'),
            client_id: configService.getOrThrow('FIREBASE_CLIENT_ID'),
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: configService.getOrThrow('FIREBASE_CLIENT_CERT_URL'),
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
  ],
  // providers: [TransactionService],
})
export class AppModule {}
