import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminNotificationListener } from './admin-notification.listener';
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
  NotificationsModule,
} from '@urcab-workspace/shared';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AdminRole.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserRepository, RoleRepository, PermissionRepository, AdminNotificationListener],
  exports: [UsersService],
})
export class UsersModule {}

