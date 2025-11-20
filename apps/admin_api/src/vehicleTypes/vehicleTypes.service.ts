import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { VehicleTypeEnum, VEHICLE_CAPACITY, VehicleType } from '@urcab-workspace/shared';
import { CreateVehicleTypeDto, UpdateVehicleTypeDto, SeedVehicleTypeDto } from './dto';
import { AdminVehicleTypeRepository } from './repository';
import { Types } from 'mongoose';

@Injectable()
export class VehicleTypesService {
  constructor(private readonly vehicleTypeRepository: AdminVehicleTypeRepository) {}

  async create(createVehicleTypeDto: CreateVehicleTypeDto, userId: string) {
    const existingVehicleType = await this.vehicleTypeRepository.findOne({
      name: createVehicleTypeDto.name,
    });

    if (existingVehicleType) {
      throw new ConflictException(`Vehicle type ${createVehicleTypeDto.name} already exists`);
    }

    return this.vehicleTypeRepository.createVehicleType({
      _id: new Types.ObjectId(),
      ...createVehicleTypeDto,
      createdBy: new Types.ObjectId(userId),
    } as VehicleType);
  }

  async findAll(query: any = {}) {
    const filter = {};
    if (query.search) {
      filter['name'] = { $regex: query.search, $options: 'i' };
    }

    if (query.isActive !== undefined) {
      filter['isActive'] = query.isActive === 'true';
    }

    const vehicleTypes = await this.vehicleTypeRepository.model.find(filter);

    return {
      success: true,
      data: vehicleTypes,
    };
  }

  async findOne(id: string) {
    const vehicleType = await this.vehicleTypeRepository.findOne({ _id: new Types.ObjectId(id) });
    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID ${id} not found`);
    }
    return vehicleType;
  }

  async update(id: string, updateVehicleTypeDto: UpdateVehicleTypeDto, userId: string) {
    const vehicleType = await this.vehicleTypeRepository.findOne({ _id: new Types.ObjectId(id) });
    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID ${id} not found`);
    }

    return this.vehicleTypeRepository.findOneAndUpdate(
      { _id: new Types.ObjectId(id) },
      { ...updateVehicleTypeDto, updatedBy: new Types.ObjectId(userId) },
    );
  }

  async remove(id: string) {
    const vehicleType = await this.vehicleTypeRepository.findOne({ _id: new Types.ObjectId(id) });
    if (!vehicleType) {
      throw new NotFoundException(`Vehicle type with ID ${id} not found`);
    }

    return this.vehicleTypeRepository.findOneAndDelete({ _id: new Types.ObjectId(id) });
  }

  async seedVehicleTypes(seedDto: SeedVehicleTypeDto, userId: string) {
    const { override = false } = seedDto;
    const vehicleTypesToSeed = [];

    // Get all vehicle types from the enum
    const vehicleTypeEnumValues = Object.values(VehicleTypeEnum);

    for (const vehicleTypeName of vehicleTypeEnumValues) {
      const existingVehicleType = await this.vehicleTypeRepository.findOne({ name: vehicleTypeName });

      // If the vehicle type already exists and override is false, skip
      if (existingVehicleType && !override) {
        continue;
      }

      // If the vehicle type exists and override is true, update it
      if (existingVehicleType && override) {
        await this.vehicleTypeRepository.findOneAndUpdate(
          { _id: existingVehicleType._id },
          {
            pricingPeriods: this.getDefaultPricingPeriods(vehicleTypeName),
            capacity: VEHICLE_CAPACITY[vehicleTypeName],
            updatedBy: new Types.ObjectId(userId),
          },
        );
        vehicleTypesToSeed.push(existingVehicleType.name);
        continue;
      }

      // Create new vehicle type
      await this.vehicleTypeRepository.createVehicleType({
        _id: new Types.ObjectId(),
        name: vehicleTypeName,
        pricingPeriods: this.getDefaultPricingPeriods(vehicleTypeName),
        capacity: VEHICLE_CAPACITY[vehicleTypeName] as number,
        isActive: true,
        createdBy: new Types.ObjectId(userId),
      } as VehicleType);

      vehicleTypesToSeed.push(vehicleTypeName);
    }

    return {
      message: `Successfully seeded ${vehicleTypesToSeed.length} vehicle types`,
      seededTypes: vehicleTypesToSeed,
    };
  }

  // Helper method to determine default pricing periods based on vehicle type
  private getDefaultPricingPeriods(vehicleType: string) {
    // Get base price tier for this vehicle type
    const basePriceTier = this.getBasePriceTier(vehicleType);

    // Create standard pricing periods for all vehicle types
    return [
      // Day rate (9AM - 5PM)
      {
        name: 'Day Rate',
        startTime: '09:00',
        endTime: '17:00',
        baseFare: basePriceTier * 3,
        baseDistance: 2.0,
        incrementalRate: basePriceTier * 0.25,
        incrementalDistance: 1.0,
      },
      // Evening rate (5PM - 10PM)
      {
        name: 'Evening Rate',
        startTime: '17:00',
        endTime: '22:00',
        baseFare: basePriceTier * 3.5,
        baseDistance: 2.0,
        incrementalRate: basePriceTier * 0.3,
        incrementalDistance: 1.0,
      },
      // Night rate (10PM - 12AM)
      {
        name: 'Night Rate',
        startTime: '22:00',
        endTime: '00:00',
        baseFare: basePriceTier * 4,
        baseDistance: 2.0,
        incrementalRate: basePriceTier * 0.35,
        incrementalDistance: 0.5,
      },
      // Late night rate (12AM - 6AM)
      {
        name: 'Late Night Rate',
        startTime: '00:00',
        endTime: '06:00',
        baseFare: basePriceTier * 4.5,
        baseDistance: 2.0,
        incrementalRate: basePriceTier * 0.375,
        incrementalDistance: 0.2,
      },
      // Morning rate (6AM - 9AM)
      {
        name: 'Morning Rate',
        startTime: '06:00',
        endTime: '09:00',
        baseFare: basePriceTier * 3.5,
        baseDistance: 2.0,
        incrementalRate: basePriceTier * 0.3,
        incrementalDistance: 0.5,
      },
    ];
  }

  // Helper method to determine base price tier based on vehicle type
  private getBasePriceTier(vehicleType: string): number {
    // Basic price tiers based on vehicle type category
    switch (vehicleType) {
      // Economy tier
      case VehicleTypeEnum.JUSTCAB:
        return 0.8;

      // Comfort tier

      // Taxi tier (using the exact values from the example)
      case VehicleTypeEnum.TAXI:
        return 1.0; // Base multiplier is 1.0 for taxi

      // Premium tier

      // XL/Family tier
      case VehicleTypeEnum.MPV:
        return 1.7;

      // Special tier

      // Eco tier

      // Default
      default:
        return 1.0;
    }
  }
}
