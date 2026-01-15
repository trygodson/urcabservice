import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserProfileService } from './user-profile.service';
import { ChangePasswordDto, UpdateProfileDto, UserProfileResponseDto } from './dto';
import {
  CurrentUser,
  JwtAdminAuthGuard,
  SetRolesMetaData,
  Role,
  User,
} from '@urcab-workspace/shared';

@ApiTags('Admin - User Profile')
@Controller('admin/user-profile')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth()
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get('me')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get current user profile with roles and permissions' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@CurrentUser() user: User): Promise<UserProfileResponseDto> {
    return await this.userProfileService.getMe(user._id.toString());
  }

  @Patch('profile')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update profile (full name, email, photo)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateProfile(@CurrentUser() user: User, @Body() updateProfileDto: UpdateProfileDto) {
    return await this.userProfileService.updateProfile(user._id.toString(), updateProfileDto);
  }

  @Patch('change-password')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @ApiResponse({ status: 400, description: 'New password must be different from current password' })
  async changePassword(@CurrentUser() user: User, @Body() changePasswordDto: ChangePasswordDto) {
    return await this.userProfileService.changePassword(user._id.toString(), changePasswordDto);
  }
}

