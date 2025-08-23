import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
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
} from '@urcab-workspace/shared';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow('JWT_DSECRET'),
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
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      // { name: RefreshToken.name, schema: RefreshTokenSchema },
      // { name: Country.name, schema: CountrySchema },
      // { name: Wallet.name, schema: WalletSchema },
    ]),
    // forwardRef(() => WalletsModule),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, LocalStrategy, AuthService, UserRepository, RefreshTokenRepository],
  exports: [AuthService],
})
export class DriverAuthModule {}
