import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule, UploadFileService, User, UserRepository, UserSchema } from '@urcab-workspace/shared';
import { HttpModule } from '@nestjs/axios';
import { UserVerificationModule } from '../user-verification/userVerification.module';

@Module({
  imports: [
    DatabaseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    HttpModule,
    UserVerificationModule,
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
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository, UploadFileService],
  exports: [UserService],
})
export class UserModule {}
