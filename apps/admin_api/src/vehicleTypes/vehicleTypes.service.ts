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
            pricePerKM: this.getDefaultPricePerKM(vehicleTypeName),
            capacity: VEHICLE_CAPACITY[vehicleTypeName],
            updatedBy: new Types.ObjectId(userId),
          },
        );
        vehicleTypesToSeed.push(existingVehicleType.name);
        continue;
      }

      // Create new vehicle type
      await this.vehicleTypeRepository.createVehicleType({
        name: vehicleTypeName,
        pricePerKM: this.getDefaultPricePerKM(vehicleTypeName) as number,
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

  // Helper method to determine default pricing based on vehicle type
  private getDefaultPricePerKM(vehicleType: string): number {
    // Basic price tiers based on vehicle type category
    switch (vehicleType) {
      // Economy tier
      case VehicleTypeEnum.SEDAN:
      case VehicleTypeEnum.HATCHBACK:
      case VehicleTypeEnum.COMPACT:
        return 1.0;

      // Comfort tier
      case VehicleTypeEnum.SUV_SMALL:
      case VehicleTypeEnum.CROSSOVER:
      case VehicleTypeEnum.ESTATE:
      case VehicleTypeEnum.TAXI:
        return 1.5;

      // Premium tier
      case VehicleTypeEnum.SUV_LARGE:
      case VehicleTypeEnum.LUXURY_SEDAN:
      case VehicleTypeEnum.EXECUTIVE:
        return 2.0;

      // XL/Family tier
      case VehicleTypeEnum.MPV:
      case VehicleTypeEnum.MINIVAN:
        return 2.5;

      // Special tier
      case VehicleTypeEnum.VAN:
      case VehicleTypeEnum.MICROBUS:
      case VehicleTypeEnum.PICKUP_TRUCK:
      case VehicleTypeEnum.TRUCK:
        return 3.0;

      // Accessible tier
      case VehicleTypeEnum.WHEELCHAIR_ACCESSIBLE:
        return 2.0;

      // Luxury tier
      case VehicleTypeEnum.LUXURY_SUV:
      case VehicleTypeEnum.LIMOUSINE:
        return 4.0;

      // Eco tier
      case VehicleTypeEnum.ELECTRIC_CAR:
      case VehicleTypeEnum.HYBRID:
        return 1.8;

      // Default
      default:
        return 1.5;
    }
  }
}
