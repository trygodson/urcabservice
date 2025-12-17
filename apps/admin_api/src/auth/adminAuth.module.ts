import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './adminAuth.controller';
import { AuthService } from './adminAuth.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ConfigModule, ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JwtModule, JwtService } from '@nestjs/jwt';

import { JwtAStrategy, LocalStrategy } from './strategies';
import {
  DatabaseModule,
  LoggerModule,
  RefreshToken,
  RefreshTokenRepository,
  RefreshTokenSchema,
  User,
  UserRepository,
  UserSchema,
  AdminRole,
  RoleSchema,
  RoleRepository,
  Permission,
  PermissionSchema,
  PermissionRepository,
} from '@urcab-workspace/shared';

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
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: AdminRole.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAStrategy,
    LocalStrategy,
    UserRepository,
    RefreshTokenRepository,
    RoleRepository,
    PermissionRepository,
  ],
  exports: [AuthService],
})
export class AdminAuthModule {}
