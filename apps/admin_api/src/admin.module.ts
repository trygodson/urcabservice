import { Module } from '@nestjs/common';
import { DatabaseModule, AppConfig, LoggerModule } from '@urcab-workspace/shared';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AdminAuthModule } from './auth';
import { AdminDriversModule } from './drivers/adminDrivers.module';
import { VehicleTypesModule } from './vehicleTypes/vehicleTypes.module';
import { AdminPassengersModule } from './passengers/adminPassengers.module';
import { AdminSettingsModule } from './settings/settings.module';
import { PricingZonesModule } from './pricing-zones/pricing-zones.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { DriverSubscriptionsModule } from './driver-subscriptions/driver-subscriptions.module';
import { PassengerTransactionsModule } from './passenger-transactions/passenger-transactions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { FaqsModule } from './faqs/faqs.module';
import { UserProfileModule } from './user-profile/user-profile.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';

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
    EventEmitterModule.forRoot(),
    AdminAuthModule,
    AdminDriversModule,
    VehicleTypesModule,
    AdminPassengersModule,
    AdminSettingsModule,
    PricingZonesModule,
    RolesModule,
    UsersModule,
    PermissionsModule,
    SubscriptionPlansModule,
    DriverSubscriptionsModule,
    PassengerTransactionsModule,
    DashboardModule,
    ReportsModule,
    FaqsModule,
    UserProfileModule,
    WithdrawalsModule,
  ],

  // providers: [AdminService],
})
export class AdminModule {}
