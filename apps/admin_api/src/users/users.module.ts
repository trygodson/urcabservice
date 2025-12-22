import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import {
  DatabaseModule,
  User,
  UserSchema,
  UserRepository,
  RoleRepository,
  AdminRole,
  RoleSchema,
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
  controllers: [UsersController],
  providers: [UsersService, UserRepository, RoleRepository, PermissionRepository],
  exports: [UsersService],
})
export class UsersModule {}

