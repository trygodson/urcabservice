import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  BadRequestException,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  Role,
  SetRolesMetaData,
  UpdateDriverProfileDto,
  UploadFileService,
  User,
} from '@urcab-workspace/shared';
import { DriverService } from './driver.service';

@ApiTags('Driver')
@UseGuards(JwtAuthGuard)
@Controller('driver')
@ApiBearerAuth()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('me')
  @SetRolesMetaData(Role.DRIVER)
  getProfile(@CurrentUser() user: User) {
    // console.log(user, '---user=----');
    return this.driverService.getUser({ _id: user._id });
  }

  @Put('me')
  @ApiOperation({ summary: 'Update driver profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @SetRolesMetaData(Role.DRIVER)
  async updateProfile(@CurrentUser() user: User, @Body() updateProfileDto: UpdateDriverProfileDto) {
    return await this.driverService.updateProfile(user._id.toString(), updateProfileDto);
  }
}
