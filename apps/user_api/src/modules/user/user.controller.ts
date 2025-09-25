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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtAuthGuard,
  Public,
  Role,
  SetRolesMetaData,
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

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('me')
  @SetRolesMetaData(Role.DRIVER, Role.PASSENGER)
  getProfile(@CurrentUser() user: User) {
    // console.log(user, '---user=----');
    return this.userService.getUser({ _id: user._id });
  }

  @Post('single')
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
        folder: {
          type: 'string',
          description: 'Optional folder name',
        },
        makePublic: {
          type: 'boolean',
          description: 'Make file public (default: true)',
        },
      },
    },
  })
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
