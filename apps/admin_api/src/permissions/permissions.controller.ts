import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { PermissionResponseDto } from './dto';
import { JwtAdminAuthGuard, SetRolesMetaData, Role } from '@urcab-workspace/shared';

@ApiTags('Admin - Permissions')
@Controller('admin/permissions')
@UseGuards(JwtAdminAuthGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all active permissions' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter permissions by category' })
  @ApiResponse({ status: 200, description: 'List of permissions', type: [PermissionResponseDto] })
  async findAll(@Query('category') category?: string) {
    if (category) {
      return this.permissionsService.findByCategory(category);
    }
    return this.permissionsService.findAll();
  }

  // @Get('categories')
  // @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  // @ApiOperation({ summary: 'Get all permission categories' })
  // @ApiResponse({ status: 200, description: 'List of permission categories', type: [String] })
  // async getCategories() {
  //   return this.permissionsService.getCategories();
  // }

  // @Get(':id')
  // @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  // @ApiOperation({ summary: 'Get a permission by ID' })
  // @ApiResponse({ status: 200, description: 'Permission details', type: PermissionResponseDto })
  // @ApiResponse({ status: 404, description: 'Permission not found' })
  // async findOne(@Param('id') id: string) {
  //   return this.permissionsService.findOne(id);
  // }
}
