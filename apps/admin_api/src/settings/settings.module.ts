import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  DatabaseModule,
  UploadFileService,
  User,
  UserSchema,
  Settings,
  SettingsSchema,
  WalletTransaction,
  WalletTransactionSchema,
} from '@urcab-workspace/shared';
import { LoggerModule } from 'nestjs-pino';
import { AdminSettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [
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
    LoggerModule,
    DatabaseModule,
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Settings.name, schema: SettingsSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
  ],
  controllers: [AdminSettingsController],
  providers: [UploadFileService, SettingsService],
  exports: [SettingsService],
})
export class AdminSettingsModule {}
