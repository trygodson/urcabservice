import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import {
  DatabaseModule,
  Permission,
  PermissionSchema,
  PermissionRepository,
} from '@urcab-workspace/shared';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionRepository],
  exports: [PermissionsService],
})
export class PermissionsModule {}

