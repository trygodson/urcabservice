import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import {
  DatabaseModule,
  AdminRole,
  RoleSchema,
  Permission,
  PermissionSchema,
  RoleRepository,
  PermissionRepository,
  UserRepository,
  User,
  UserSchema,
} from '@urcab-workspace/shared';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: AdminRole.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RolesController],
  providers: [RolesService, RoleRepository, UserRepository, PermissionRepository, UserRepository],
  exports: [RolesService],
})
export class RolesModule {}
