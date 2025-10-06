import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DriverLocation, UpdateDriverProfileDto, User, UserRepository } from '@urcab-workspace/shared';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, DocumentStatus } from '@urcab-workspace/shared';
import { DocumentVerificationStatusService } from './documentVerification.service';

@Injectable()
export class DriverService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly documentVerificationService: DocumentVerificationStatusService,
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<Vehicle>,
    @InjectModel(User.name) private readonly userRepository2: Model<User>,
    @InjectModel(DriverLocation.name) private readonly driverLocation: Model<DriverLocation>,
  ) {}

  async getUser({ _id }) {
    try {
      const user = await this.userRepository.findById(_id, [], {
        select:
          'fullName email phone photo type gender dob isPhoneConfirmed isEmailConfirmed isActive isPhotoUpload isProfileUpdated',
      });
      if (!user) {
        throw new UnauthorizedException('User Does Not Exist');
      }

      // Check document verification status
      const verificationStatus = await this.documentVerificationService.getDocumentVerificationStatus(
        new Types.ObjectId(_id),
      );

      // Check if driver has registered any vehicles
      const vehicles = await this.vehicleModel
        .find({
          driverId: new Types.ObjectId(_id),
          isActive: true,
        })
        .lean();
      const driverlocation = await this.driverLocation
        .findOne({
          driverId: new Types.ObjectId(_id),
          // isActive: true,
        })
        .lean();

      // Calculate verification progress
      const verificationProgress = this.calculateVerificationProgress(verificationStatus);

      // Check if profile is complete
      const isProfileComplete = verificationStatus.hasCompleteDocumentation;
      delete user.fcmToken;
      return {
        success: true,
        data: {
          ...user,
          status: driverlocation.status,
          driverVerification: {
            isStarted: verificationStatus.uploadedCount > 0,
            isComplete: isProfileComplete,
            progress: verificationProgress,
            verifiedDocuments: verificationStatus.verifiedCount,
            pendingDocuments:
              verificationStatus.uploadedCount - verificationStatus.verifiedCount - verificationStatus.rejectedCount,
            rejectedDocuments: verificationStatus.rejectedCount,
            totalRequired: verificationStatus.requiredCount,
            hasVehicleRegistered: vehicles.length > 0,
            vehicleCount: vehicles.length,
            // primaryVehicle: vehicles.find((v) => v.isPrimary),
            overallStatus: verificationStatus.overallStatus,
            expiringSoonCount: verificationStatus.expiringSoonCount,
            canGoOnline: this.canDriverGoOnline(isProfileComplete, vehicles),
            blockingItems: await this.getBlockingItems(_id, isProfileComplete, vehicles),
          },
        },
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Failed to get user details');
    }
  }

  private calculateVerificationProgress(verificationStatus: any): number {
    if (verificationStatus.requiredCount === 0) return 0;

    const progress = (verificationStatus.verifiedCount / verificationStatus.requiredCount) * 100;
    return Math.round(progress);
  }

  private canDriverGoOnline(isProfileComplete: boolean, vehicles: Vehicle[]): boolean {
    return (
      isProfileComplete &&
      vehicles.length > 0 &&
      vehicles.some((v) => v.status === 'VERIFIED' && v.hasCompleteDocumentation)
    );
  }

  private async getBlockingItems(driverId: string, isProfileComplete: boolean, vehicles: Vehicle[]): Promise<string[]> {
    const blockingItems: string[] = [];

    // Check profile verification
    if (!isProfileComplete) {
      const { missingItems } = await this.documentVerificationService.isDriverFullyVerified(
        new Types.ObjectId(driverId),
      );
      blockingItems.push(...missingItems);
    }

    // Check vehicle requirements
    if (vehicles.length === 0) {
      blockingItems.push('No vehicle registered');
    } else {
      const hasVerifiedVehicle = vehicles.some((v) => v.status === 'VERIFIED' && v.hasCompleteDocumentation);

      if (!hasVerifiedVehicle) {
        blockingItems.push('No verified vehicle available');
      }

      // Check for primary vehicle
      if (!vehicles.some((v) => v.isPrimary)) {
        blockingItems.push('No primary vehicle selected');
      }
    }

    return blockingItems;
  }

  async updateProfile(userId: string, updateDto: UpdateDriverProfileDto) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User Does Not Exist');
      }

      // Only update the allowed fields
      const updateData: Partial<typeof user> = {};

      if (updateDto.fullName) {
        updateData.fullName = updateDto.fullName;
      }

      if (updateDto.phone) {
        // Check if phone number is already in use by another user
        const existingUserWithPhone = await this.userRepository2.findOne({
          phone: updateDto.phone,
          _id: { $ne: userId },
        });

        if (existingUserWithPhone) {
          throw new Error('Phone number is already in use');
        }
        updateData.phone = updateDto.phone;
      }

      if (updateDto.photo) {
        updateData.photo = updateDto.photo;
        updateData.isPhotoUpload = true;
      }

      // Update the user profile
      const updatedUser = await this.userRepository2
        .findOneAndUpdate(
          { _id: new Types.ObjectId(userId) },
          { $set: updateData },
          {
            new: true,
            upsert: true,
            // select:
            //   'fullName email phone photo type gender dob isPhoneConfirmed isEmailConfirmed isActive isPhotoUpload isProfileUpdated -fcmToken',
          },
        )
        .select('-fcmToken');

      if (!updatedUser) {
        throw new Error('Failed to update profile');
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Failed to update profile');
    }
  }
}
