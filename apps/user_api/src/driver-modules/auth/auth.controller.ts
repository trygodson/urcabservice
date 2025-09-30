import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Ip,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  ForgotPasswordDto,
  GoogleSignDto,
  JwtAuthGuard,
  LocalAuthGuard,
  LoginDto,
  RegisterUserDto,
  ResetPasswordDto,
  User,
  VerifyOtpDto,
} from '@urcab-workspace/shared';

@ApiTags('Driver Auth')
@Controller('driver/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBody({ type: RegisterUserDto })
  @Post('register')
  async register(@Body() body: RegisterUserDto) {
    return await this.authService.register(body);
  }

  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@CurrentUser() user: User, @Body() body: LoginDto) {
    return await this.authService.login(user, body);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBody({ type: VerifyOtpDto })
  @Post('verifyOtp')
  async verifyOtp(@Body() body: VerifyOtpDto, @Ip() ipAddress: string) {
    return await this.authService.verifyUserOtp(body, ipAddress);
  }

  // @UseInterceptors(ClassSerializerInterceptor)
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @Post('select-country')
  // async selectCountry(@CurrentUser() user: User, @Body() body: SelectCountryDto) {
  //   console.log('Controller - User from decorator:', user);
  //   console.log('Controller - User ID:', user?._id);
  //   console.log('Controller - Body:', body);

  //   return await this.authService.selectCountry(user, body.countryId);
  // }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('forgotPassword')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body.email);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('googleSignIn')
  async googleSignIn(@Body() body: GoogleSignDto) {
    return await this.authService.googleSignIn(body.accessToken);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('googleSignUp')
  async googleSignUp(@Body() body: GoogleSignDto) {
    return await this.authService.googleSignUp(body.accessToken);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('resetPassword')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body);
  }

  // @Get('countries')
  // async getCountries() {
  //   return await this.authService.getCountries();
  // }
}
