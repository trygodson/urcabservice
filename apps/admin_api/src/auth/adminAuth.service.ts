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
import { LoginDto, RegisterUserDto, VerifyOtpDto, ChangePasswordDto, UpdateProfileDto } from './dto';
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
  RoleRepository,
  PermissionRepository,
  WalletRepository,
} from '@urcab-workspace/shared';
// import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenReposiotry: RefreshTokenRepository,
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    // private readonly countryRepository: CountryRepository,
    // @Inject(forwardRef(() => WalletsService))
    private readonly walletRepository: WalletRepository,
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

        if (user.type === Role.ADMIN || user.type === Role.SUPER_ADMIN) {
          // body?.fcmToken &&
          //   (await this.userRepository.findOneAndUpdate({ _id: user._id }, { fcmToken: body.fcmToken }));
          // console.log(user, 'user');
          // Get role and permissions
          let permissions: string[] = [];
          let roleName: string | null = null;
          const isSuperAdmin = user.type === Role.SUPER_ADMIN;

          if (user.roleId && !isSuperAdmin) {
            const role = await this.roleRepository.findById(user.roleId.toString());
            console.log(role, 'role');
            if (role && role.permissions && role.permissions.length > 0) {
              roleName = role.name;
              // Fetch permissions by IDs
              const permissionIds = role.permissions.map((p: any) =>
                typeof p === 'object' && p._id ? p._id.toString() : p.toString(),
              );
              const permissionDocs = await this.permissionRepository.findByIds(permissionIds);
              permissions = permissionDocs.map((p) => p.name);
            }
          } else if (isSuperAdmin) {
            const wallet = await this.walletRepository.findOne({ user: user._id.toString() });
            // console.log(wallet, 'wallet');
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
            // Super admin gets all permissions - we'll use a special flag
            roleName = 'Super Admin';
            permissions = ['*']; // Special permission indicating all access
          }

          return {
            success: true,
            data: {
              accessToken: access_token,
              refreshToken: refresh_token,
              user: {
                _id: user._id.toString(),
                fullName: user.fullName,
                email: user.email,
                type: user.type,
                roleId: user.roleId?.toString(),
                roleName: roleName,
                permissions: permissions,
                isSuperAdmin: isSuperAdmin,
                isProfileUpdated: user.isProfileUpdated,
                isOnboardingComplete: user.isOnboardingComplete,
                isActive: user.isActive,
              },
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
      select: 'passwordSalt passwordHash isEmailConfirmed type email roleId',
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

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ success: boolean; message: string }> {
    try {
      // Get user with password fields
      const user = await this.userRepository.findOne(
        { _id: new Types.ObjectId(userId) },
        [],
        {
          select: 'passwordSalt passwordHash email',
        },
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const currentPasswordHash = await bcrypt.hash(changePasswordDto.currentPassword, user.passwordSalt);
      if (currentPasswordHash !== user.passwordHash) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Check if new password is same as current password
      const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, user.passwordSalt);
      if (newPasswordHash === user.passwordHash) {
        throw new BadRequestException('New password must be different from current password');
      }

      // Generate new salt and hash for new password
      const newPassSalt = await bcrypt.genSalt();
      const newPasswordHashWithNewSalt = await bcrypt.hash(changePasswordDto.newPassword, newPassSalt);

      // Update password
      await this.userRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        {
          passwordHash: newPasswordHashWithNewSalt,
          passwordSalt: newPassSalt,
        },
      );

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to change password');
    }
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<any> {
    try {
      const user = await this.userRepository.findOne({ _id: new Types.ObjectId(userId) });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if email is being updated and if it already exists
      if (updateProfileDto.email && updateProfileDto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({ email: updateProfileDto.email });
        if (existingUser) {
          throw new ConflictException(`Email "${updateProfileDto.email}" is already in use`);
        }
      }

      // Build update data
      const updateData: any = {};

      if (updateProfileDto.fullName !== undefined) {
        updateData.fullName = updateProfileDto.fullName;
      }

      if (updateProfileDto.email !== undefined) {
        updateData.email = updateProfileDto.email;
        // If email is changed, mark as unverified
        if (updateProfileDto.email !== user.email) {
          updateData.isEmailConfirmed = false;
        }
      }

      if (updateProfileDto.photo !== undefined) {
        updateData.photo = updateProfileDto.photo;
      }

      // Update user
      const updatedUser = await this.userRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        updateData,
      );

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          _id: updatedUser._id.toString(),
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          photo: updatedUser.photo,
          isEmailConfirmed: updatedUser.isEmailConfirmed,
          updatedAt: updatedUser.updatedAt,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update profile');
    }
  }
}
