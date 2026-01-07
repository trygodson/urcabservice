import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Ip,
  Post,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './adminAuth.service';
import { ApiBody, ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, RegisterUserDto, ChangePasswordDto, UpdateProfileDto } from './dto';
import {
  CurrentUser,
  JwtAuthGuard,
  JwtAdminAuthGuard,
  LocalAuthGuard,
  User,
  SetRolesMetaData,
  Role,
} from '@urcab-workspace/shared';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @ApiBody({ type: RegisterUserDto })
  // @Post('register')
  // async register(@Body() body: RegisterUserDto) {
  //   return await this.authService.register(body);
  // }

  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@CurrentUser() user: User, @Body() body: LoginDto) {
    return await this.authService.login(user, body);
  }

  @Patch('change-password')
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @ApiResponse({ status: 400, description: 'New password must be different from current password' })
  async changePassword(@CurrentUser() user: User, @Body() changePasswordDto: ChangePasswordDto) {
    return await this.authService.changePassword(user._id.toString(), changePasswordDto);
  }

  @Patch('profile')
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update profile (full name, email, photo)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async updateProfile(@CurrentUser() user: User, @Body() updateProfileDto: UpdateProfileDto) {
    return await this.authService.updateProfile(user._id.toString(), updateProfileDto);
  }
}
