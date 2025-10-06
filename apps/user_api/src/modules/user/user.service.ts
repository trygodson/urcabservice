import { Length } from 'class-validator';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UpdateDriverProfileDto, User, UserRepository } from '@urcab-workspace/shared';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentVerificationStatusService } from '../user-verification/documentVerificationStatus.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectModel(User.name) private readonly userRepository2: Model<User>,
    private readonly documentVerificationService: DocumentVerificationStatusService,
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

      // Get document verification status
      const verificationStatus = await this.documentVerificationService.getVerificationStatus(new Types.ObjectId(_id));

      // Check for NRIC and Passport status
      const documentStatus = {
        hasNRIC: verificationStatus.documents.nric.exists,
        nricStatus: verificationStatus.documents.nric.status,
        hasPassport: verificationStatus.documents.passport.exists,
        passportStatus: verificationStatus.documents.passport.status,
        isVerified: verificationStatus.isFullyVerified,
        pendingCount: verificationStatus.documentsStatus.pending,
        rejectedCount: verificationStatus.documentsStatus.rejected,
        verifiedCount: verificationStatus.documentsStatus.verified,
        hasStartedVerification: verificationStatus.documentsStatus.total > 0,
      };

      return {
        success: true,
        data: {
          ...user,
          verificationStatus: documentStatus,
          hasUploadedDocuments: documentStatus.hasNRIC || documentStatus.hasPassport,
          documentVerification: {
            isStarted: documentStatus.hasStartedVerification,
            isComplete: documentStatus.isVerified,
            documentsUploaded: verificationStatus.documentsStatus.total,
            pendingVerification: documentStatus.pendingCount,
            expiringDocuments: verificationStatus.expiringDocuments,
            lastUpdated: verificationStatus.lastUpdated,
          },
        },
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Failed to get user details');
    }
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
        const existingUserWithPhone = await this.userRepository.findOne({
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
      }

      // Update the user profile
      const updatedUser = await this.userRepository2
        .findOneAndUpdate({ _id: userId }, { $set: updateData }, { new: true, upsert: true })
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
