import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthNotificationListener } from './auth-notification.listener';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ConfigModule, ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JwtModule, JwtService } from '@nestjs/jwt';

import { JwtStrategy, LocalStrategy } from './strategies';
import {
  DatabaseModule,
  LoggerModule,
  RefreshToken,
  RefreshTokenRepository,
  RefreshTokenSchema,
  User,
  UserRepository,
  UserSchema,
  NotificationsModule,
} from '@urcab-workspace/shared';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow('JWT_SECRET'),
          signOptions: {
            expiresIn: `${configService.getOrThrow('JWT_EXPIRATION')}s`,
          },
        };
      },
      inject: [ConfigService],
    }),
    LoggerModule,
    DatabaseModule,
    NotificationsModule,
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    LocalStrategy,
    AuthService,
    AuthNotificationListener,
    UserRepository,
    RefreshTokenRepository,
  ],
  exports: [AuthService],
})
export class AuthModule {}
