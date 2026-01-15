import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import {
  UserRepository,
  RoleRepository,
  PermissionRepository,
  Role,
} from '@urcab-workspace/shared';
import { ChangePasswordDto, UpdateProfileDto, UserProfileResponseDto } from './dto';

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async getMe(userId: string): Promise<UserProfileResponseDto> {
    try {
      // Get user with role populated
      const user = await this.userRepository.findOne(
        { _id: new Types.ObjectId(userId), type: { $in: [Role.ADMIN, Role.SUPER_ADMIN] } },
        [{ path: 'roleId' }],
        {
          select: '-passwordHash -passwordSalt -fcmToken -emailConfirmationCode -phoneConfirmationCode -resetPasswordOtp -resetPasswordOtpExpiry -resetPasswordCount -loginFailedCount -lastLoginDate -isFirstTime',
        },
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const isSuperAdmin = user.type === Role.SUPER_ADMIN;
      let permissions: any[] = [];
      let roleName: string | null = null;

      if (isSuperAdmin) {
        // Super Admin has all permissions
        const allPermissions = await this.permissionRepository.find({ isActive: true });
        permissions = allPermissions.map((p) => ({
          _id: p._id.toString(),
          name: p.name,
          description: p.description,
          category: p.category,
        }));
        roleName = 'Super Admin';
      } else if (user.roleId) {
        // Get role ID - handle both populated and non-populated cases
        const roleIdString = (user.roleId as any)?._id?.toString() || (user.roleId as any)?.toString() || user.roleId?.toString();
        
        if (roleIdString) {
          // Get role with permissions populated
          const role = await this.roleRepository.findByIdWithPermissions(roleIdString);
          if (role && role.permissions) {
            roleName = role.name;
            // Extract permission IDs
            const permissionIds = role.permissions.map((p: any) => {
              if (typeof p === 'object' && p._id) {
                return p._id.toString();
              }
              return p.toString();
            });

            // Fetch full permission details
            if (permissionIds.length > 0) {
              const permissionDocs = await this.permissionRepository.findByIds(permissionIds);
              permissions = permissionDocs.map((p) => ({
                _id: p._id.toString(),
                name: p.name,
                description: p.description,
                category: p.category,
              }));
            }
          }
        }
      }

      return {
        _id: user._id.toString(),
        fullName: user.fullName || '',
        email: user.email || '',
        photo: user.photo,
        type: user.type,
        roleId: user.roleId?._id?.toString() || user.roleId?.toString() || null,
        roleName,
        permissions,
        isSuperAdmin,
        isEmailConfirmed: user.isEmailConfirmed || false,
        isActive: user.isActive !== undefined ? user.isActive : true,
        isProfileUpdated: user.isProfileUpdated || false,
        isOnboardingComplete: user.isOnboardingComplete || false,
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get user profile for ${userId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get user profile');
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
      this.logger.error(`Failed to update profile for ${userId}:`, error);
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
      this.logger.error(`Failed to change password for ${userId}:`, error);
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to change password');
    }
  }
}

