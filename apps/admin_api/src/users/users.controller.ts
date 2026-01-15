import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateAdminUserDto, UpdateAdminUserDto, UserPermissionsResponseDto, QueryUsersDto } from './dto';
import { JwtAdminAuthGuard, SetRolesMetaData, Role, CurrentUser } from '@urcab-workspace/shared';

@ApiTags('Admin - Users')
@Controller('admin/users')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new admin user (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateAdminUserDto, @CurrentUser() user: any) {
    return this.usersService.createAdminUser(createUserDto, user._id.toString());
  }

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all admin users with pagination (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'roleId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of admin users with pagination' })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get an admin user by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Edit user details by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async editUserById(@Param('id') id: string, @Body() updateUserDto: UpdateAdminUserDto, @CurrentUser() user: any) {
    return this.usersService.updateUserById(id, updateUserDto, user._id.toString());
  }

  @Delete(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID (Super Admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete Super Admin user' })
  async deleteUserById(@Param('id') id: string) {
    await this.usersService.deleteUserById(id);
  }

  @Get(':id/permissions')
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'View user permissions by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User permissions', type: UserPermissionsResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async viewPermissionUserById(@Param('id') id: string): Promise<UserPermissionsResponseDto> {
    return this.usersService.viewUserPermissionsById(id);
  }
}
