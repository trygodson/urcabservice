import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto';
import { JwtAdminAuthGuard, SetRolesMetaData, Role, CurrentUser, User } from '@urcab-workspace/shared';

@ApiTags('Admin - Roles')
@Controller('admin/roles')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new role (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Role created successfully', type: RoleResponseDto })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  async create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() user: User) {
    return this.rolesService.create(createRoleDto, user._id.toString());
  }

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all active roles' })
  @ApiResponse({ status: 200, description: 'List of roles', type: [RoleResponseDto] })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, description: 'Role details', type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a role (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully', type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: User,
  ) {
    return this.rolesService.update(id, updateRoleDto, user._id.toString());
  }

  @Delete(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role (Super Admin only)' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
  }
}

