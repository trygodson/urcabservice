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
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  Role,
  SetRolesMetaData,
  UpdateDriverProfileDto,
  updateFCMDto,
  UploadFileService,
  User,
} from '@urcab-workspace/shared';
import { FileUploadOptions } from '@urcab-workspace/shared';

@ApiTags('User')
@UseGuards(JwtAuthGuard)
@Controller('user')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService, private readonly uploadFileService: UploadFileService) {}

  // @UseInterceptors(ClassSerializerInterceptor)
  @Get('me')
  @SetRolesMetaData(Role.PASSENGER)
  getProfile(@CurrentUser() user: User) {
    // console.log(user, '---user=----');
    return this.userService.getUser({ _id: user._id });
  }

  @Put('me')
  @ApiOperation({ summary: 'Update driver profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @SetRolesMetaData(Role.PASSENGER)
  async updateProfile(@CurrentUser() user: User, @Body() updateProfileDto: UpdateDriverProfileDto) {
    return await this.userService.updateProfile(user._id.toString(), updateProfileDto);
  }

  @Put('fcmToken')
  @ApiOperation({ summary: 'Update fcm token' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @SetRolesMetaData(Role.PASSENGER)
  async fcmToken(@CurrentUser() user: User, @Body() updateProfileDto: updateFCMDto) {
    return await this.userService.updateFCMToken(user._id.toString(), updateProfileDto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        // folder: {
        //   type: 'string',
        //   description: 'Optional folder name',
        // },
        // makePublic: {
        //   type: 'boolean',
        //   description: 'Make file public (default: true)',
        // },
      },
    },
  })
  // @SetRolesMetaData(Role.DRIVER, Role.PASSENGER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    // @Body() body: { folder?: string; makePublic?: boolean },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const options: FileUploadOptions = {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'],
      maxSize: 5 * 1024 * 1024, // 5MB
    };

    return this.uploadFileService.uploadFile(file.buffer, file.originalname, file.mimetype, options);
  }
}
