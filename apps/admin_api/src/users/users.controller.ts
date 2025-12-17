import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateAdminUserDto } from './dto';
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
  @ApiOperation({ summary: 'Get all admin users (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'List of admin users' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get an admin user by ID (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}

