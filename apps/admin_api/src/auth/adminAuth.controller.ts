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
import { LoginDto, RegisterUserDto, VerifyOtpDto } from './dto';
import {
  CurrentUser,
  JwtAuthGuard,
  JwtAdminAuthGuard,
  LocalAuthGuard,
  User,
  SetRolesMetaData,
  Role,
  ForgotPasswordDto,
  ResetPasswordDto,
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

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBody({ type: ForgotPasswordDto })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent to email successfully' })
  @ApiResponse({ status: 404, description: 'User with this email does not exist' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body.email);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBody({ type: ResetPasswordDto })
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 404, description: 'User with this email does not exist' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body);
  }

  // @UseInterceptors(ClassSerializerInterceptor)
  // @ApiBody({ type: VerifyOtpDto })
  // @Post('verify-otp')
  // @ApiOperation({ summary: 'Verify OTP for email confirmation' })
  // @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  // @ApiResponse({ status: 400, description: 'Invalid OTP or token expired' })
  // @ApiResponse({ status: 401, description: 'Unauthorized' })
  // async verifyOtp(@Body() body: VerifyOtpDto, @Ip() ipAddress: string) {
  //   return await this.authService.verifyOtp(body, ipAddress);
  // }
}
