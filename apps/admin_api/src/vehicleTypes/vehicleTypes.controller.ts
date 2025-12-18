import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { VehicleTypesService } from './vehicleTypes.service';
import { CreateVehicleTypeDto, UpdateVehicleTypeDto, SeedVehicleTypeDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAdminAuthGuard, Role, SetRolesMetaData } from '@urcab-workspace/shared';
import { CurrentUser } from '@urcab-workspace/shared';

@ApiTags('Admin - Vehicle Types')
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller('admin/vehicle-types')
export class VehicleTypesController {
  constructor(private readonly vehicleTypesService: VehicleTypesService) {}

  @Post()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new vehicle type with time-based pricing' })
  @ApiResponse({ status: 201, description: 'Vehicle type created successfully' })
  create(@Body() createVehicleTypeDto: CreateVehicleTypeDto, @CurrentUser() user: any) {
    return this.vehicleTypesService.create(createVehicleTypeDto, user.sub);
  }

  @Get()
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all vehicle types with pagination' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Vehicle types retrieved successfully' })
  findAll(@Query() query: any) {
    return this.vehicleTypesService.findAll(query);
  }

  @Get(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get a single vehicle type by ID' })
  @ApiParam({ name: 'id', description: 'Vehicle Type ID' })
  @ApiResponse({ status: 200, description: 'Vehicle type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle type not found' })
  findOne(@Param('id') id: string) {
    return this.vehicleTypesService.findOne(id);
  }

  @Patch(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a vehicle type' })
  @ApiParam({ name: 'id', description: 'Vehicle Type ID' })
  @ApiResponse({ status: 200, description: 'Vehicle type updated successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle type not found' })
  update(@Param('id') id: string, @Body() updateVehicleTypeDto: UpdateVehicleTypeDto, @CurrentUser() user: any) {
    return this.vehicleTypesService.update(id, updateVehicleTypeDto, user.sub);
  }

  @Delete(':id')
  @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a vehicle type' })
  @ApiParam({ name: 'id', description: 'Vehicle Type ID' })
  @ApiResponse({ status: 200, description: 'Vehicle type deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle type not found' })
  remove(@Param('id') id: string) {
    return this.vehicleTypesService.remove(id);
  }

  // @Post('seed')
  // @SetRolesMetaData(Role.SUPER_ADMIN, Role.ADMIN)
  // @ApiOperation({ summary: 'Seed vehicle types from enum values with time-based pricing' })
  // @ApiResponse({ status: 200, description: 'Vehicle types seeded successfully' })
  // seedVehicleTypes(@Body() seedDto: SeedVehicleTypeDto, @CurrentUser() user: any) {
  //   return this.vehicleTypesService.seedVehicleTypes(seedDto, user.sub);
  // }
}
