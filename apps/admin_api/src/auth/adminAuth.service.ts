/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { OAuth2Client } from 'google-auth-library';
import { Types } from 'mongoose'; // <-- ADD THIS LINE HERE
import { LoginDto, RegisterUserDto, VerifyOtpDto } from './dto';
import {
  GenerateOtp,
  generateRandomString,
  JwtAdminSign,
  JwtAdminSignRefresh,
  JwtAVerify,
  JwtSign,
  RefreshTokenRepository,
  Role,
  timeZoneMoment,
  User,
  UserRepository,
} from '@urcab-workspace/shared';
// import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenReposiotry: RefreshTokenRepository,
    // private readonly countryRepository: CountryRepository,
    // @Inject(forwardRef(() => WalletsService))
    // private readonly walletsService: WalletsService,
    private readonly configService: ConfigService,
  ) {}

  async register(body: RegisterUserDto) {
    try {
      await this.validateCreateUser(body.email);
      const passSalt = await bcrypt.genSalt();
      const cc: RegisterUserDto = {
        ...body,
        password: await bcrypt.hash(body.password, passSalt),
      };
      const { expiry, otp } = GenerateOtp();
      let dd = {
        ...cc,
        email: cc.email,
        type: Role.ADMIN,
        passwordHash: cc.password,
        passwordSalt: passSalt,
        emailConfirmationCode: otp,
        emailConfirmationExpiryDate: expiry,
      };
      const verificationToken = JwtSign({
        email: dd.email,
        type: dd?.type,
        expiry: dd.emailConfirmationExpiryDate,
      });
      await this.userRepository.create(dd);

      return {
        success: true,
        messsage: 'User Created successfully Otp Sent',
        data: { verificationToken },
      };
    } catch (error) {
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(user: User, body?: LoginDto) {
    try {
      if (user.isEmailConfirmed === false) {
        const { expiry, otp } = GenerateOtp();
        const updateRepo = await this.userRepository.findOneAndUpdate(
          { _id: new Types.ObjectId(user._id) },
          {
            emailConfirmationCode: otp,
            emailConfirmationExpiryDate: expiry,
          },
        );

        if (updateRepo) {
          const verification_token = JwtAdminSign({
            email: updateRepo.email,
            type: updateRepo.type,
            expiry: updateRepo.emailConfirmationExpiryDate,
          });
          return {
            success: true,
            messsage: 'Account Unverified OTP Sent',
            data: { verification_token, account_verified: false },
          };
        }
      } else {
        const refresh_token = await this.generateRefreshToken(user, '');
        const access_token = await this.generateAccessTokens(user, refresh_token);

        // Check if user has completed onboarding
        // const needsOnboarding = !user.country || !user.isOnboardingComplete;

        if (user.type === Role.ADMIN) {
          // body?.fcmToken &&
          //   (await this.userRepository.findOneAndUpdate({ _id: user._id }, { fcmToken: body.fcmToken }));

          return {
            success: true,
            data: {
              accessToken: access_token,
              refreshToken: refresh_token,
              type: user.type,
              isProfileUpdated: user.isProfileUpdated,
              isOnboardingComplete: user.isOnboardingComplete,
              // needsOnboarding,
            },
          };
        } else {
          throw new BadRequestException('Not Your Specs');
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // async verifyUserOtp(verifyToken: VerifyOtpDto, ipAddress: string) {
  //   try {
  //     const decodedToken = JwtAVerify(verifyToken.verificationToken);
  //     if (timeZoneMoment(decodedToken.data?.expiry).toDate() < timeZoneMoment().toDate())
  //       throw new BadRequestException('Verification Token Expired');

  //     const res = await this.userRepository.findOne(
  //       {
  //         email: decodedToken.data?.email,
  //         isEmailConfirmed: false,
  //       },
  //       [],
  //     );

  //     if (res && !res.isEmailConfirmed) {
  //       if (res.emailConfirmationCode === verifyToken.otpCode) {
  //         if (decodedToken.data?.type === Role.ADMIN) {
  //           const refreshToken = await this.generateRefreshToken(res, ipAddress);
  //           const accessToken = await this.generateAccessTokens(res);

  //           const dd = await this.userRepository.findOneAndUpdate({ email: res.email }, { isEmailConfirmed: true });

  //           return {
  //             success: true,
  //             data: {
  //               refreshToken,
  //               accessToken,
  //               type: dd.type,
  //               isProfileUpdated: dd.isProfileUpdated,
  //               needsOnboarding: true,
  //             },
  //           };
  //         } else {
  //           throw new BadRequestException('Incorrect User Request');
  //         }
  //       } else {
  //         throw new BadRequestException('Incorrect OTP Code.');
  //       }
  //     } else if (res && res.isEmailConfirmed) {
  //       return {
  //         success: false,
  //         message: 'Email has Already been confirmed',
  //       };
  //     }
  //   } catch (err) {
  //     if (err.message.includes('expired')) {
  //       throw new UnauthorizedException('Token Has Expired! Please Try Again.');
  //     } else {
  //       throw new UnauthorizedException(err?.message ?? 'Error Verifying');
  //     }
  //   }
  // }

  async generateRefreshToken(user: User, ipAddress: string) {
    try {
      const prevRefresh = await this.refreshTokenReposiotry.findOne({
        user: user._id,
        revoked: false,
      });

      if (
        prevRefresh &&
        prevRefresh.isActive &&
        timeZoneMoment(prevRefresh.expiresAt).toDate() > timeZoneMoment().toDate()
      ) {
        return prevRefresh.token;
      } else {
        const res = await this.refreshTokenReposiotry.create({
          expiresAt: timeZoneMoment().add(7, 'days').toDate(),
          user: user._id,
          token: generateRandomString(),
          ipAddress: ipAddress,
        });
        return res.token;
      }
    } catch (error) {
      throw error;
    }
  }

  async generateAccessTokens(user: User, refresh_token?: string) {
    const accessTokenPayload = {
      user_id: user._id,
      email: user.email,
    };
    const access_token = JwtAdminSignRefresh(accessTokenPayload, refresh_token);
    return access_token;
  }

  private async validateCreateUser(email: string) {
    const res = await this.userRepository.findOne({
      email: email,
    });
    if (res) {
      throw new ConflictException('Email Already Exists');
    } else {
      return;
    }
  }

  async verifyUser(email: string, password: string): Promise<User | never> {
    const theuser = await this.userRepository.findOne({ email: email }, [], {
      select: 'passwordSalt passwordHash isEmailConfirmed type email',
    });

    if (!theuser) {
      throw new UnauthorizedException('User Does Not Exist');
    }

    const isPasswordValid = await bcrypt.hash(password, theuser.passwordSalt);

    if (isPasswordValid != theuser.passwordHash) {
      throw new UnauthorizedException('Credentials Not Valid');
    }
    return theuser;
  }

  async getUser({ _id }) {
    try {
      return await this.userRepository.findOne({
        _id: _id,
      });
    } catch (error) {
      throw new UnauthorizedException('User Does Not Exist');
    }
  }
}
