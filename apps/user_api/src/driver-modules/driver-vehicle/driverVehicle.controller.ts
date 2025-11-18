import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { VehicleService } from './driverVehicle.service';
import { CreateVehicleDto, UpdateVehicleDto, VehicleResponseDto } from './dto/createVehicle.dto';
import { JwtAuthGuard, RolesGuard, Role, CurrentUser, User, SetRolesMetaData } from '@urcab-workspace/shared';

@ApiTags('Driver Vehicles')
@Controller('driver/vehicles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiBody({ type: CreateVehicleDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Vehicle created successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid vehicle data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Vehicle with this license plate or VIN already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Driver must be verified before creating vehicles',
  })
  @HttpCode(HttpStatus.CREATED)
  @SetRolesMetaData(Role.DRIVER)
  async createVehicle(
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser() user: User,
  ): Promise<VehicleResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleService.createVehicle(driverId, createVehicleDto);
  }
  @Get()
  @ApiOperation({ summary: 'Get all driver vehicles' })
  @ApiQuery({
    name: 'includeInactive',
    description: 'Include inactive vehicles',
    required: false,
    type: 'boolean',
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver vehicles retrieved successfully',
    type: [VehicleResponseDto],
  })
  @SetRolesMetaData(Role.DRIVER)
  async getDriverVehicles(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive: boolean = false,
    @CurrentUser() user: User,
  ): Promise<VehicleResponseDto[]> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleService.getDriverVehicles(driverId, includeInactive);
  }
  @Put(':vehicleId')
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiBody({ type: UpdateVehicleDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle updated successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vehicle not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid vehicle data or vehicle does not belong to driver',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Vehicle with this license plate or VIN already exists',
  })
  @SetRolesMetaData(Role.DRIVER)
  async updateVehicle(
    @Param('vehicleId') vehicleId: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: User,
  ): Promise<VehicleResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleService.updateVehicle(vehicleId, driverId, updateVehicleDto);
  }

  @Get('primary')
  @ApiOperation({ summary: 'Get driver primary vehicle' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Primary vehicle retrieved successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No primary vehicle found',
  })
  @SetRolesMetaData(Role.DRIVER)
  async getPrimaryVehicle(@CurrentUser() user: User): Promise<VehicleResponseDto | null> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleService.getPrimaryVehicle(driverId);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get driver primary vehicle' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Primary vehicle retrieved successfully',
    // type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No primary vehicle found',
  })
  @SetRolesMetaData(Role.DRIVER)
  async getVehicleTypes(@CurrentUser() user: User): Promise<any> {
    return await this.vehicleService.getVehicleTypes();
  }

  @Get(':vehicleId')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle retrieved successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vehicle not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Vehicle does not belong to this driver',
  })
  @SetRolesMetaData(Role.DRIVER)
  async getVehicle(@Param('vehicleId') vehicleId: string, @CurrentUser() user: User): Promise<VehicleResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleService.getVehicleById(vehicleId, driverId);
  }

  @Put(':vehicleId/set-primary')
  @ApiOperation({ summary: 'Set vehicle as primary' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vehicle set as primary successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vehicle not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Vehicle does not belong to this driver',
  })
  @SetRolesMetaData(Role.DRIVER)
  async setPrimaryVehicle(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: User,
  ): Promise<VehicleResponseDto> {
    const driverId = new Types.ObjectId(user._id);
    return await this.vehicleService.setPrimaryVehicle(vehicleId, driverId);
  }

  @Delete(':vehicleId')
  @ApiOperation({ summary: 'Delete (deactivate) a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Vehicle deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vehicle not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Vehicle does not belong to this driver',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @SetRolesMetaData(Role.DRIVER)
  async deleteVehicle(@Param('vehicleId') vehicleId: string, @CurrentUser() user: User): Promise<void> {
    const driverId = new Types.ObjectId(user._id);
    await this.vehicleService.deleteVehicle(vehicleId, driverId);
  }
}
