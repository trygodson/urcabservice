import { Injectable, NotFoundException, ConflictException, Logger, InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AdminPricingZoneRepository } from './repository/adminPricingZone.repository';
import { CreatePricingZoneDto, UpdatePricingZoneDto, QueryPricingZoneDto } from './dto';

@Injectable()
export class PricingZonesService {
  private readonly logger = new Logger(PricingZonesService.name);

  constructor(
    private readonly pricingZoneRepository: AdminPricingZoneRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(createPricingZoneDto: CreatePricingZoneDto, adminId: string) {
    // Check if zone with same name already exists
    const existingZone = await this.pricingZoneRepository.findOne({
      name: createPricingZoneDto.name,
    });

    if (existingZone) {
      throw new ConflictException(`Pricing zone with name ${createPricingZoneDto.name} already exists`);
    }

    // Create new pricing zone with GeoJSON Point location for spatial queries
    return this.pricingZoneRepository.create({
      _id: new Types.ObjectId(),
      ...createPricingZoneDto,
      // Create a GeoJSON Point for the center
      location: {
        type: 'Point',
        coordinates: [createPricingZoneDto.centerLongitude, createPricingZoneDto.centerLatitude],
      },
      createdBy: new Types.ObjectId(adminId),
    });
  }

  async findAll(query: QueryPricingZoneDto) {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    }

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    // Check if querying for a specific location
    if (query.longitude !== undefined && query.latitude !== undefined) {
      const zone = await this.pricingZoneRepository.findZoneForLocation(query.longitude, query.latitude);

      if (zone) {
        return {
          zones: [zone],
          pagination: {
            page: 1,
            limit: 1,
            total: 1,
            pages: 1,
          },
          locationInfo: {
            inZone: true,
            zoneName: zone.name,
            priceMultiplier: zone.priceMultiplier,
          },
        };
      } else {
        return {
          zones: [],
          pagination: {
            page: 1,
            limit: 1,
            total: 0,
            pages: 0,
          },
          locationInfo: {
            inZone: false,
          },
        };
      }
    }

    // Regular zones query with pagination
    const zones = await this.pricingZoneRepository.findWithPagination(filter, skip, limit, {
      sort: { createdAt: -1 },
    });

    const total = await this.pricingZoneRepository.countDocuments(filter);

    return {
      zones,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const zone = await this.pricingZoneRepository.findById(id);

    if (!zone) {
      throw new NotFoundException(`Pricing zone with ID ${id} not found`);
    }

    return zone;
  }

  async update(id: string, updatePricingZoneDto: UpdatePricingZoneDto, adminId: string) {
    // Check if zone exists
    const zone = await this.pricingZoneRepository.findById(id);

    if (!zone) {
      throw new NotFoundException(`Pricing zone with ID ${id} not found`);
    }

    // If name is being updated, check it's not a duplicate
    if (updatePricingZoneDto.name && updatePricingZoneDto.name !== zone.name) {
      const existingZone = await this.pricingZoneRepository.findOne({
        name: updatePricingZoneDto.name,
        _id: { $ne: new Types.ObjectId(id) }, // Exclude the current zone
      });

      if (existingZone) {
        throw new ConflictException(`Pricing zone with name ${updatePricingZoneDto.name} already exists`);
      }
    }

    // Update the zone
    const update: any = {
      ...updatePricingZoneDto,
      updatedBy: new Types.ObjectId(adminId),
    };

    // Only update location if lat/lng are provided
    if (updatePricingZoneDto.centerLongitude !== undefined && updatePricingZoneDto.centerLatitude !== undefined) {
      update.location = {
        type: 'Point',
        coordinates: [updatePricingZoneDto.centerLongitude, updatePricingZoneDto.centerLatitude],
      };
    }

    return this.pricingZoneRepository.findOneAndUpdate({ _id: new Types.ObjectId(id) }, update);
  }

  async remove(id: string) {
    const zone = await this.pricingZoneRepository.findById(id);

    if (!zone) {
      throw new NotFoundException(`Pricing zone with ID ${id} not found`);
    }

    return this.pricingZoneRepository.findOneAndDelete({ _id: new Types.ObjectId(id) });
  }

  async checkLocationZone(longitude: number, latitude: number) {
    const zone = await this.pricingZoneRepository.findZoneForLocation(longitude, latitude);

    if (zone) {
      return {
        inZone: true,
        zoneName: zone.name,
        zoneId: zone._id.toString(),
        priceMultiplier: zone.priceMultiplier,
      };
    } else {
      return {
        inZone: false,
        priceMultiplier: 1.0, // Default multiplier
      };
    }
  }

  /**
   * Search for locations using Mapbox Geocoding API
   * @param searchText The search query text
   * @param countryCode Optional country code to limit results (e.g., 'ng' for Nigeria)
   * @param limit Maximum number of results to return (default: 7)
   * @returns Array of location suggestions
   */
  async searchLocations(searchText: string, countryCode?: string, limit: number = 7) {
    try {
      const mapboxToken = this.configService.get<string>('MAPBOX_SECRET');

      if (!mapboxToken) {
        throw new InternalServerErrorException('MAPBOX_SECRET environment variable is not set');
      }

      // Build the request URL
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json`;

      // Add query parameters
      const params = new URLSearchParams({
        access_token: mapboxToken,
        autocomplete: 'true',
        limit: limit.toString(),
      });

      // Add country filter if provided
      if (countryCode) {
        params.append('country', countryCode);
      }

      url += `?${params.toString()}`;

      // Make the request using axios via HttpService
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error) => {
            this.logger.error(`Error searching locations: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch location suggestions from Mapbox');
          }),
        ),
      );

      return {
        success: true,
        results: data.features || [],
      };
    } catch (error) {
      this.logger.error(`Error in searchLocations: ${error.message}`, error.stack);

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to search for locations');
    }
  }
}
