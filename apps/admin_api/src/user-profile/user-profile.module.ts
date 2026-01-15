import { Module } from '@nestjs/common';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';
import {
  DatabaseModule,
  User,
  UserSchema,
  UserRepository,
  AdminRole,
  RoleSchema,
  RoleRepository,
  Permission,
  PermissionSchema,
  PermissionRepository,
} from '@urcab-workspace/shared';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AdminRole.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [UserProfileController],
  providers: [UserProfileService, UserRepository, RoleRepository, PermissionRepository],
  exports: [UserProfileService],
})
export class UserProfileModule {}

