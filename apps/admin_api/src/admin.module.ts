import { Module } from '@nestjs/common';
import { DatabaseModule, AppConfig, LoggerModule } from '@urcab-workspace/shared';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthModule } from './auth';
import { AdminDriversModule } from './drivers/adminDrivers.module';
import { VehicleTypesModule } from './vehicleTypes/vehicleTypes.module';
import { AdminPassengersModule } from './passengers/adminPassengers.module';
import { AdminSettingsModule } from './settings/settings.module';
import { PricingZonesModule } from './pricing-zones/pricing-zones.module';

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

    AdminAuthModule,
    AdminDriversModule,
    VehicleTypesModule,
    AdminPassengersModule,
    AdminSettingsModule,
    PricingZonesModule,
  ],

  // providers: [AdminService],
})
export class AdminModule {}
