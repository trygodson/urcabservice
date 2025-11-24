import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileUploadOptions, Public, UploadFileService } from '@urcab-workspace/shared';

@ApiTags('Admin Settings')
@Controller('settings')
export class AdminSettingsController {
  constructor(private readonly uploadFileService: UploadFileService) {}

  @Post('upload')
  @Public()
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
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: 5 * 1024 * 1024, // 5MB
    };

    return this.uploadFileService.uploadFileCloudinary(file.buffer, file.originalname, file.mimetype, options);
  }
}
