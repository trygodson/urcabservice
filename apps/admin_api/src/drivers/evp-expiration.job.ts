import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { AdminDriverEvpRepository, AdminVehicleRepository, AdminUserRepository } from './repository';
import { VehicleEvpStatus } from '@urcab-workspace/shared';

@Injectable()
export class EvpExpirationJob {
  private readonly logger = new Logger(EvpExpirationJob.name);

  constructor(
    private readonly driverEvpRepository: AdminDriverEvpRepository,
    private readonly vehicleRepository: AdminVehicleRepository,
    private readonly userRepository: AdminUserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run daily at 9:00 AM to check for expiring and expired EVPs
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkEvpExpiration() {
    this.logger.log('Starting EVP expiration check job...');
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    try {
      // Find active EVPs that are expiring soon (within 30 days)
      const expiringEvps = await this.driverEvpRepository.find({
        isActive: true,
        endDate: {
          $gte: now,
          $lte: thirtyDaysFromNow,
        },
        revokedAt: { $exists: false },
      });

      this.logger.log(`Found ${expiringEvps.length} EVPs expiring soon`);

      // Process each expiring EVP
      for (const evp of expiringEvps) {
        try {
          // Get vehicle and driver information
          const vehicle = await this.vehicleRepository.findById(evp.vehicleId.toString());
          if (!vehicle) {
            this.logger.warn(`Vehicle not found for EVP ${evp._id}`);
            continue;
          }

          const driver = await this.userRepository.model.findById(vehicle.driverId.toString());
          if (!driver) {
            this.logger.warn(`Driver not found for vehicle ${vehicle._id}`);
            continue;
          }

          // Calculate days until expiration
          const daysUntilExpiry = Math.ceil((evp.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Emit event for expiring EVP
          this.eventEmitter.emit('evp.expiring_soon', {
            evpId: evp._id.toString(),
            vehicleId: evp.vehicleId.toString(),
            driverId: driver._id.toString(),
            driverEmail: driver.email,
            driverName: driver.fullName,
            driverFcmToken: driver.fcmToken,
            certificateNumber: evp.certificateNumber,
            endDate: evp.endDate,
            daysUntilExpiry,
            vehicleMake: vehicle.make,
            vehicleModel: vehicle.model,
            licensePlate: vehicle.licensePlate,
          });

          this.logger.log(`Emitted expiring_soon event for EVP ${evp._id}, expires in ${daysUntilExpiry} days`);
        } catch (error) {
          this.logger.error(`Error processing expiring EVP ${evp._id}:`, error.stack);
        }
      }

      // Find expired EVPs that are still marked as active
      const expiredEvps = await this.driverEvpRepository.find({
        isActive: true,
        endDate: { $lt: now },
        revokedAt: { $exists: false },
      });

      this.logger.log(`Found ${expiredEvps.length} expired EVPs`);

      // Process each expired EVP
      for (const evp of expiredEvps) {
        try {
          // Update EVP status to inactive
          await this.driverEvpRepository.findOneAndUpdate(
            { _id: evp._id },
            {
              isActive: false,
              status: VehicleEvpStatus.EXPIRED.toString(),
            },
          );

          // Get vehicle and driver information
          const vehicle = await this.vehicleRepository.findById(evp.vehicleId.toString());
          if (!vehicle) {
            this.logger.warn(`Vehicle not found for EVP ${evp._id}`);
            continue;
          }

          const driver = await this.userRepository.findById(vehicle.driverId.toString());
          if (!driver) {
            this.logger.warn(`Driver not found for vehicle ${vehicle._id}`);
            continue;
          }

          // Calculate days since expiration
          const daysSinceExpiry = Math.ceil((now.getTime() - evp.endDate.getTime()) / (1000 * 60 * 60 * 24));

          // Emit event for expired EVP
          this.eventEmitter.emit('evp.expired', {
            evpId: evp._id.toString(),
            vehicleId: evp.vehicleId.toString(),
            driverId: driver._id.toString(),
            driverEmail: driver.email,
            driverName: driver.fullName,
            driverFcmToken: driver.fcmToken,
            certificateNumber: evp.certificateNumber,
            endDate: evp.endDate,
            daysSinceExpiry,
            vehicleMake: vehicle.make,
            vehicleModel: vehicle.model,
            licensePlate: vehicle.licensePlate,
          });

          this.logger.log(`Emitted expired event for EVP ${evp._id}, expired ${daysSinceExpiry} days ago`);
        } catch (error) {
          this.logger.error(`Error processing expired EVP ${evp._id}:`, error.stack);
        }
      }

      this.logger.log('EVP expiration check job completed');
    } catch (error) {
      this.logger.error('Error in EVP expiration check job:', error.stack);
    }
  }
}
