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
import { AuthService } from './adminAuth.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { LoginDto, RegisterUserDto } from './dto';
import { CurrentUser, JwtAuthGuard, LocalAuthGuard, User } from '@urcab-workspace/shared';

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
}
