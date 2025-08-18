import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig, DatabaseModule, LoggerModule } from '@urcab-workspace/shared';
import { FirebaseModule } from 'nestjs-firebase';
import { UserModule } from './modules/user';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { RidesModule } from './modules/rides/rides.modules';
// import { BullBoardModule } from '@bull-board/nestjs';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [AppConfig],
    }),
    FirebaseModule.forRootAsync({
      useFactory: (configServie: ConfigService) => {
        return {
          googleApplicationCredential: {
            clientEmail: 'firebase-adminsdk-p2w1x@ondrtest-bb765.iam.gserviceaccount.com',
            privateKey:
              '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3tDKQPoGBEiet\nVJRaD653wVNNk+6bu0TVCTVV9SEUEd0hZ2r0reTcGk7gg8bHxZQyEvMLYfGi+/kF\nD+9wgFary9basY/FrLDTY9IuliEpKaIgnyhn0hv67v2wkIawjXY3RIIeK6j7Zx6N\nQPygEIgCUXj5Smme0E5Q0R/yppacJRItxwkQVbjC9WZgOIU0mTzWGkjwNhUVpB/V\nNOsKLQTIeTcN2GmK0zekDEgeUSUelBzJClDkWd9nQKndeUPC9ohLyOIE1EvU+8Rc\nWhMv/B4QZ53wMx5Lk6+GzBa2u3ZcJ0pYq/xyByCpk1eiOeEbUmhGmrEOCTeJHOCy\nQQ3chwGfAgMBAAECggEAR4xKaT2/CLs+ctbPVOhopkHIpR1pwIPGgkas3Ea11HBE\ntP7nfFbCHSut7unEIQiF+J7CxHsoNrd2vI8BTcredtjUXKbtfSsOT7bAJN7aGYMa\nnyP+A7mkpi4w5nTT0K24DjyDhSayEQCPuKpH+juWDXkX6dgenPk6l2Vr0QErBbML\nYjToJaQlfnzuxrLecR8RjAknaM5e1AeaKvuO6AKAQippWMzQZS79dviT/1FcbeWN\nVtJDr6MvGw5K8PpRW1Qy1f6xSF+5vheuMJ588UvqB+H+JRDUd/Ke+omo9vFPCfVg\nDq6bWs/UtzIOGwMl9x4nFQyPG2Lrv48ayGpzM2lQoQKBgQD/GDVKaBP++j3fTrLF\n+tkR1LinQBuZpQO3UzpdtdloSZGPUwbMFH32Wq4cBYsg9Oa8guoXDpFBo1fsWQnK\nqGj+ZGvS/RZ2RUkUlZN5WUfnGMLfY3nXAGcT9yaexY3bsCR+OoMj0qjdgmsI7dKK\nBtib5qt4fLs83wsiKsuN/dq9DwKBgQC4Wx7DrS2gH13SeRl1VEX0CIZ5nvSVtoHL\n7FKw/4tNQcTjYeWNMdGFyaSrSlrsz9L+cY6dP1BqrFYKYTrOL7/avRgqAjSKc/4a\n0SthbPIQCQtVqW2XZoslNnqOywN7IHfMyglVX7Mn3236geIUeOD1ZJTnoYq5zKwS\nrjM9PGmScQKBgQCFOWxjfrWqvaBgpqZBNX/2iwUg/B8t//tP3ByoYle32mw10SPE\no5MhfTxfEBoYTS7QFwMQpaABCsDZg6rUd13WNjYFy/3WKNtA79lET/d4XvsvVbGF\nMwWibLpzwzMSIAz/C6n/pH5iqUEjOalyQp8P1MmKtIHJCaez4WvLrV92ywKBgQCD\nN+A62O3Ltee64pU7TOOJofPNZ1WhpkjWk/v7nbhSIgj463pPOHFwr6i0fvUe74G3\nt64RwLoFY2rOcow/q/77u3ISnIU3Mv5fqhgdfUUCIt3dd/3YMJXDw/YR4vA0WFTM\n/9UK3lYPgFmwX3hCqBM+tvvBrtqmCsdDeJhh8rkWEQKBgASD3ySdePNiYfnc+lFh\nP19xZSIoMjhDZyh4URU9uVy26DNYqLcBloB0m9f5ImONiI/erN0YDYS+1clxyjt/\nKn9fGklF0Rpl7NB2RdbRnKUQQ8X67LdMoiGX8igcihE80oDVLDKQNLe+YRod9ff1\nbHNG1d3gXnYXF5J24X3V39c9\n-----END PRIVATE KEY-----\n',
            projectId: 'ondrtest-bb765',
          },
        };
      },
      inject: [ConfigService],
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
    UserModule,
    RidesModule,
  ],
  // providers: [TransactionService],
})
export class AppModule {}
