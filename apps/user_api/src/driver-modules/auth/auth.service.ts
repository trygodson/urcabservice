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
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';

import { OAuth2Client } from 'google-auth-library';
import { Types } from 'mongoose'; // <-- ADD THIS LINE HERE
import {
  GenerateOtp,
  generateRandomString,
  JwtDSign,
  JwtDSignRefresh,
  JwtDVerify,
  JwtSign,
  JwtSignRefresh,
  JwtVerify,
  RefreshTokenRepository,
  Role,
  timeZoneMoment,
  UserRepository,
  LoginDto,
  RegisterUserDto,
  ResetPasswordDto,
  User,
  VerifyOtpDto,
  DriverOnlineStatus,
  WalletRepository,
} from '@urcab-workspace/shared';
import { DriverLocationRepository } from '../driver-location/repository/driver-location.repository';
// import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly driverLocationRepository: DriverLocationRepository,
    private readonly refreshTokenReposiotry: RefreshTokenRepository,
    // private readonly countryRepository: CountryRepository,
    // @Inject(forwardRef(() => WalletsService))
    private readonly walletRepository: WalletRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async createWallet(user: User) {
    const wallet = await this.walletRepository.findAdminWallet();

    if (!wallet) {
      await this.walletRepository.model.create({
        _id: new Types.ObjectId(),
        user: user._id,
        depositBalance: 0,
        withdrawableBalance: 0,
        totalBalance: 0,
        totalDeposited: 0,
        lastTransactionDate: new Date(),
      });
    }
  }
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
        type: Role.DRIVER,
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
      const createdUser = await this.userRepository.create(dd);

      // Emit user registered event
      this.eventEmitter.emit('auth.user_registered', {
        userId: createdUser._id.toString(),
        email: dd.email,
        fullName: dd.fullName || '',
        userType: 'driver',
        verificationToken: otp,
      });

      return {
        success: true,
        messsage: 'User Created successfully Otp Sent',
        data: { verificationToken },
      };
    } catch (error) {
      throw error;
    }
  }

  async logout(user: User) {
    try {
      let dd = await this.driverLocationRepository.findOneAndUpdate(
        { driverId: new Types.ObjectId(user._id) },
        { status: DriverOnlineStatus.OFFLINE, isAvailableForRides: false },
      );
      if (!dd) {
        throw new NotFoundException('Driver not found');
      }
      return {
        success: true,
        message: 'Driver logged out successfully',
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
          const verification_token = JwtSign({
            email: updateRepo.email,
            type: updateRepo.type,
            expiry: updateRepo.emailConfirmationExpiryDate,
          });

          // Emit email verification requested event
          this.eventEmitter.emit('auth.email_verification_requested', {
            userId: updateRepo._id.toString(),
            email: updateRepo.email,
            fullName: updateRepo.fullName || '',
            otpCode: otp,
            verificationToken: verification_token,
          });

          return {
            success: true,
            messsage: 'Account Unverified OTP Sent',
            data: { verificationToken: verification_token, accountVerified: false },
          };
        }
      } else {
        const refresh_token = await this.generateRefreshToken(user, '');
        const access_token = await this.generateAccessTokens(user, refresh_token);

        // Check if user has completed onboarding
        // const needsOnboarding = !user.country || !user.isOnboardingComplete;

        if (user.type === Role.DRIVER) {
          await this.createWallet(user);
          body?.fcmToken &&
            (await this.userRepository.findOneAndUpdate({ _id: user._id }, { fcmToken: body.fcmToken }));
          return {
            success: true,
            accountVerified: true,
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

  // async selectCountry(user: User, countryId: string) {
  //   console.log('Selecting country:', countryId, 'for user:', user._id);

  //   // Validate ObjectId format
  //   if (!Types.ObjectId.isValid(countryId)) {
  //     throw new BadRequestException('Invalid country ID format');
  //   }

  //   const country = await this.countryRepository.findOne({
  //     _id: new Types.ObjectId(countryId),
  //     isActive: true,
  //   });

  //   console.log('Found country:', country);

  //   if (!country) {
  //     // Let's check what countries exist
  //     const allCountries = await this.countryRepository.find({});
  //     console.log(
  //       'Available countries:',
  //       allCountries.map((c) => ({ id: c._id, name: c.name })),
  //     );

  //     throw new NotFoundException(`Country not found with ID: ${countryId}`);
  //   }

  //   // Update user with country
  //   const updatedUser = await this.userRepository.findOneAndUpdate(
  //     { _id: user._id },
  //     { country: country._id },
  //   );

  //   // Create wallet for user
  //   // await this.walletsService.createWallet(user._id);

  //   return {
  //     success: true,
  //     message: 'Country selected successfully',
  //     data: {
  //       country: {
  //         name: country.name,
  //         code: country.code,
  //         currency: country.currency,
  //         currencySymbol: country.currencySymbol,
  //       },
  //     },
  //   };
  // }

  // async getCountries() {
  //   const countries = await this.countryRepository.find({ isActive: true }, []);
  //   console.log('Found countries:', countries.length);
  //   console.log('First country:', countries[0]);
  //   return {
  //     success: true,
  //     data: countries.map((country) => ({
  //       _id: country._id,
  //       name: country.name,
  //       code: country.code,
  //       flag: country.flag,
  //       currency: country.currency,
  //       currencySymbol: country.currencySymbol,
  //     })),
  //   };
  // }
  async resendOtp(email: string) {
    try {
      const user = await this.userRepository.findOne({ email });
      if (!user) {
        throw new NotFoundException('User with this email does not exist');
      }

      // Check if user is already verified
      if (user.isEmailConfirmed) {
        throw new BadRequestException('Email is already verified. No need to resend OTP.');
      }

      // Generate new OTP
      const { expiry, otp } = GenerateOtp();

      // Update user with new OTP
      const updatedUser = await this.userRepository.findOneAndUpdate(
        { email },
        {
          emailConfirmationCode: otp,
          emailConfirmationExpiryDate: expiry,
        },
      );

      if (!updatedUser) {
        throw new NotFoundException('Failed to update user');
      }

      // Generate new verification token
      const verificationToken = JwtSign({
        email: updatedUser.email,
        type: updatedUser.type,
        expiry: updatedUser.emailConfirmationExpiryDate,
      });

      // Emit email verification requested event
      this.eventEmitter.emit('auth.email_verification_requested', {
        userId: updatedUser._id.toString(),
        email: updatedUser.email,
        fullName: updatedUser.fullName || '',
        otpCode: otp,
        verificationToken: verificationToken,
      });

      return {
        success: true,
        message: 'OTP resent successfully',
        data: { verificationToken },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to resend OTP');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ email });
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    const { otp, expiry } = GenerateOtp(6);

    const updatedUser = await this.userRepository.findOneAndUpdate(
      { email },
      {
        resetPasswordOtp: otp,
        resetPasswordOtpExpiry: expiry,
      },
    );

    if (updatedUser) {
      // Emit password reset requested event
      this.eventEmitter.emit('auth.password_reset_requested', {
        userId: updatedUser._id.toString(),
        email: updatedUser.email,
        fullName: updatedUser.fullName || '',
        otpCode: otp,
      });
    }

    return { success: true, message: 'OTP sent to email' };
  }

  async resetPassword(data: ResetPasswordDto) {
    const user = await this.userRepository.model
      .findOne({ email: data.email }, [], { select: 'resetPasswordOtp resetPasswordOtpExpiry email' })
      .lean<User>();
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    if (
      !user.resetPasswordOtp ||
      !user.resetPasswordOtpExpiry ||
      user.resetPasswordOtp !== data.otp ||
      timeZoneMoment(user.resetPasswordOtpExpiry).toDate() < timeZoneMoment().toDate()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const passSalt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(data.password, passSalt);

    await this.userRepository.findOneAndUpdate(
      { email: data.email },
      {
        passwordHash,
        passwordSalt: passSalt,
        resetPasswordOtp: null,
        resetPasswordOtpExpiry: null,
      },
    );

    return { success: true, message: 'Password reset successful' };
  }

  async googleSignIn(accessToken: string) {
    try {
      const client = new OAuth2Client({
        clientId: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
        clientSecret: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_SECRET'),
      });
      const ticket = await client.verifyIdToken({
        idToken: accessToken,
        audience: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      const user = await this.userRepository.findOne({ email: payload.email });
      if (user) {
        return await this.login(user);
      }
      throw new NotFoundException('No account found. Please sign up.');
    } catch (error) {
      throw error;
    }
  }

  async googleSignUp(accessToken: string, ipAddress?: string) {
    try {
      const client = new OAuth2Client({
        clientId: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
        clientSecret: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_SECRET'),
      });
      const ticket = await client.verifyIdToken({
        idToken: accessToken,
        audience: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
      });
      const payload = ticket.getPayload();

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        email: payload.email,
      });
      if (existingUser) {
        throw new ConflictException('User already exists. Please sign in.');
      }

      // Create new user
      const passSalt = await bcrypt.genSalt();
      const randomPassword = await bcrypt.hash(generateRandomString(8), passSalt);

      const user = await this.userRepository.create({
        email: payload.email,
        fullName: payload.given_name + ' ' + payload.family_name,
        passwordHash: randomPassword,
        passwordSalt: passSalt,
        isEmailConfirmed: true,
        emailConfirmationDate: timeZoneMoment().toDate(),
      });

      const refresh_token = await this.generateRefreshToken(user, ipAddress);
      const access_token = await this.generateAccessTokens(user);

      return {
        success: true,
        refreshToken: refresh_token,
        accessToken: access_token,
        needsOnboarding: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async verifyUserOtp(verifyToken: VerifyOtpDto, ipAddress: string) {
    try {
      const decodedToken = JwtVerify(verifyToken.verificationToken);
      if (timeZoneMoment(decodedToken.data?.expiry).toDate() < timeZoneMoment().toDate())
        throw new BadRequestException('Verification Token Expired');

      const res = await this.userRepository.findOne(
        {
          email: decodedToken.data?.email,
          // isEmailConfirmed: false,
        },
        [],
      );
      console.log(res, '=====the res===');
      if (res && !res.isEmailConfirmed) {
        if (res.emailConfirmationCode === verifyToken.otpCode) {
          if (decodedToken.data?.type === Role.DRIVER) {
            const refreshToken = await this.generateRefreshToken(res, ipAddress);
            const accessToken = await this.generateAccessTokens(res);

            const dd = await this.userRepository.findOneAndUpdate({ email: res.email }, { isEmailConfirmed: true });

            // Emit email verified event
            this.eventEmitter.emit('auth.email_verified', {
              userId: dd._id.toString(),
              email: dd.email,
              fullName: dd.fullName || '',
            });

            return {
              success: true,
              data: {
                refreshToken,
                accessToken,
                type: dd.type,
                isProfileUpdated: dd.isProfileUpdated,
                needsOnboarding: true,
              },
            };
          } else {
            throw new BadRequestException('Incorrect User Request');
          }
        } else {
          throw new BadRequestException('Incorrect OTP Code.');
        }
      } else if (res && res.isEmailConfirmed) {
        return {
          success: false,
          message: 'Email has Already been confirmed',
        };
      }
    } catch (err) {
      if (err.message.includes('expired')) {
        throw new UnauthorizedException('Token Has Expired! Please Try Again.');
      } else {
        throw new UnauthorizedException(err?.message ?? 'Error Verifying');
      }
    }
  }

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
    const access_token = JwtSignRefresh(accessTokenPayload, refresh_token);
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
