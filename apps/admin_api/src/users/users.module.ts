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
} from '@urcab-workspace/shared';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AdminRole.name, schema: RoleSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserRepository, RoleRepository],
  exports: [UsersService],
})
export class UsersModule {}

