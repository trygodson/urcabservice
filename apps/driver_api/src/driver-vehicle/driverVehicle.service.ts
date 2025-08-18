import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { VehicleRepository } from './repository/vehicle.repository';
import { User, UserRepository } from '@urcab-workspace/shared';
import { CreateVehicleDto, UpdateVehicleDto, VehicleResponseDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class VehicleService {
  private readonly logger = new Logger(VehicleService.name);

  constructor(
    private readonly vehicleRepository: VehicleRepository,
    @InjectModel(User.name) private readonly userRepository: Model<User>,
  ) {}

  async createVehicle(driverId: Types.ObjectId, createVehicleDto: CreateVehicleDto): Promise<VehicleResponseDto> {
    try {
      // Check if driver is verified before allowing vehicle upload
      await this.checkDriverVerificationStatus(driverId);

      // Check for duplicate license plate
      const licensePlateExists = await this.vehicleRepository.checkLicensePlateExists(createVehicleDto.licensePlate);
      if (licensePlateExists) {
        throw new ConflictException('A vehicle with this license plate already exists');
      }

      // Check for duplicate VIN
      const vinExists = await this.vehicleRepository.checkVinExists(createVehicleDto.vin);
      if (vinExists) {
        throw new ConflictException('A vehicle with this VIN already exists');
      }

      // If no vehicles exist for this driver, make this the primary vehicle
      const existingVehicles = await this.vehicleRepository.getDriverVehicles(driverId);
      if (existingVehicles.length === 0) {
        createVehicleDto.isPrimary = true;
      }

      const savedVehicle = await this.vehicleRepository.createVehicle(driverId, createVehicleDto);

      return this.mapToResponseDto(savedVehicle);
    } catch (error) {
      this.logger.error(`Failed to create vehicle for driver ${driverId}`, error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create vehicle');
    }
  }

  async updateVehicle(
    vehicleId: string,
    driverId: Types.ObjectId,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle exists and belongs to driver
      const existingVehicle = await this.vehicleRepository.getVehicleById(vehicleObjectId);

      if (!existingVehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (existingVehicle.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Vehicle does not belong to this driver');
      }

      // Check for duplicate license plate (excluding current vehicle)
      if (updateVehicleDto.licensePlate) {
        const licensePlateExists = await this.vehicleRepository.checkLicensePlateExists(
          updateVehicleDto.licensePlate,
          vehicleObjectId,
        );
        if (licensePlateExists) {
          throw new ConflictException('A vehicle with this license plate already exists');
        }
      }

      // Check for duplicate VIN (excluding current vehicle)
      if (updateVehicleDto.vin) {
        const vinExists = await this.vehicleRepository.checkVinExists(updateVehicleDto.vin, vehicleObjectId);
        if (vinExists) {
          throw new ConflictException('A vehicle with this VIN already exists');
        }
      }

      const updatedVehicle = await this.vehicleRepository.updateVehicle(vehicleObjectId, updateVehicleDto);

      if (!updatedVehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      return this.mapToResponseDto(updatedVehicle);
    } catch (error) {
      this.logger.error(`Failed to update vehicle ${vehicleId}`, error.stack);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to update vehicle');
    }
  }

  async getDriverVehicles(driverId: Types.ObjectId, includeInactive: boolean = false): Promise<VehicleResponseDto[]> {
    try {
      const vehicles = await this.vehicleRepository.getDriverVehicles(driverId, includeInactive);
      return vehicles.map((vehicle) => this.mapToResponseDto(vehicle));
    } catch (error) {
      this.logger.error(`Failed to get vehicles for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get driver vehicles');
    }
  }

  async getVehicleById(vehicleId: string, driverId: Types.ObjectId): Promise<VehicleResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);
      const vehicle = await this.vehicleRepository.getVehicleById(vehicleObjectId);

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (vehicle.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Vehicle does not belong to this driver');
      }

      return this.mapToResponseDto(vehicle);
    } catch (error) {
      this.logger.error(`Failed to get vehicle ${vehicleId}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to get vehicle');
    }
  }

  async getPrimaryVehicle(driverId: Types.ObjectId): Promise<VehicleResponseDto | null> {
    try {
      const vehicle = await this.vehicleRepository.getDriverPrimaryVehicle(driverId);
      return vehicle ? this.mapToResponseDto(vehicle) : null;
    } catch (error) {
      this.logger.error(`Failed to get primary vehicle for driver ${driverId}`, error.stack);
      throw new BadRequestException('Failed to get primary vehicle');
    }
  }

  async setPrimaryVehicle(vehicleId: string, driverId: Types.ObjectId): Promise<VehicleResponseDto> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle exists and belongs to driver
      const vehicle = await this.vehicleRepository.getVehicleById(vehicleObjectId);

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (vehicle.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Vehicle does not belong to this driver');
      }

      const updatedVehicle = await this.vehicleRepository.updateVehicle(vehicleObjectId, {
        isPrimary: true,
      });

      if (!updatedVehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      return this.mapToResponseDto(updatedVehicle);
    } catch (error) {
      this.logger.error(`Failed to set primary vehicle ${vehicleId}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to set primary vehicle');
    }
  }

  async deleteVehicle(vehicleId: string, driverId: Types.ObjectId): Promise<void> {
    try {
      const vehicleObjectId = new Types.ObjectId(vehicleId);

      // Verify vehicle exists and belongs to driver
      const vehicle = await this.vehicleRepository.getVehicleById(vehicleObjectId);

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      if (vehicle.driverId.toString() !== driverId.toString()) {
        throw new BadRequestException('Vehicle does not belong to this driver');
      }

      await this.vehicleRepository.updateVehicle(vehicleObjectId, {
        isActive: false,
      });
    } catch (error) {
      this.logger.error(`Failed to delete vehicle ${vehicleId}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to delete vehicle');
    }
  }

  private async checkDriverVerificationStatus(driverId: Types.ObjectId): Promise<void> {
    try {
      const driver = await this.userRepository.findOne({ _id: driverId }).exec();
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      if (!driver.isDriverVerified) {
        throw new ForbiddenException(
          'Driver must be verified before uploading vehicle information. Please complete your document verification first.',
        );
      }

      if (!driver.hasCompleteDocumentation) {
        throw new ForbiddenException(
          'Driver must have complete and verified documentation before uploading vehicle information.',
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to check driver verification status for ${driverId}`, error.stack);
      throw new BadRequestException('Failed to verify driver status');
    }
  }

  private mapToResponseDto(vehicle: any): VehicleResponseDto {
    return {
      _id: vehicle._id.toString(),
      driverId: vehicle.driverId.toString(),
      name: vehicle.name,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      status: vehicle.status,
      seatingCapacity: vehicle.seatingCapacity,
      vehicleType: vehicle.vehicleType,
      photos: vehicle.photos,
      lastInspectionDate: vehicle.lastInspectionDate,
      nextInspectionDue: vehicle.nextInspectionDue,
      verifiedByAdminId: vehicle.verifiedByAdminId?.toString(),
      verifiedAt: vehicle.verifiedAt,
      verificationNotes: vehicle.verificationNotes,
      rejectionReason: vehicle.rejectionReason,
      isActive: vehicle.isActive,
      isPrimary: vehicle.isPrimary,
      odometer: vehicle.odometer,
      features: vehicle.features,
      hasCompleteDocumentation: vehicle.hasCompleteDocumentation,
      lastDocumentVerificationCheck: vehicle.lastDocumentVerificationCheck,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }
}
