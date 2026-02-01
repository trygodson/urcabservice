import { Length } from 'class-validator';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  UpdateDriverProfileDto,
  updateFCMDto,
  AcceptConsentDto,
  User,
  UserRepository,
  Settings,
  SettingsDocument,
} from '@urcab-workspace/shared';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentVerificationStatusService } from '../user-verification/documentVerificationStatus.service';
import * as md5 from 'md5';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class UserService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    @InjectModel(User.name) private readonly userRepository2: Model<User>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>,
    private readonly documentVerificationService: DocumentVerificationStatusService,
  ) {}

  async getUser({ _id }) {
    try {
      const user = await this.userRepository.findById(_id, [], {
        select:
          'fullName email phone photo type gender dob isPhoneConfirmed isEmailConfirmed isActive isPhotoUpload isProfileUpdated acceptConsent',
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

  async updateFCMToken(userId: string, updateDto: updateFCMDto) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User Does Not Exist');
      }

      // Only update the allowed fields
      const updateData: Partial<typeof user> = {};

      updateData.fcmToken = updateDto.fcmToken;

      // Update the user profile
      await this.userRepository2
        .findOneAndUpdate({ _id: userId }, { $set: updateData }, { new: true, upsert: true })
        .select('-fcmToken');

      return {
        success: true,
        message: 'FCM updated successfully',
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Failed to update profile');
    }
  }

  /**
   * Get privacy policy from settings
   */
  async getPrivacyPolicy(): Promise<{ privacyPolicy: string; lastUpdated?: Date }> {
    try {
      const settings = await this.settingsModel.findOne().exec();

      if (!settings) {
        return {
          privacyPolicy: '',
        };
      }

      return {
        privacyPolicy: settings.privacyPolicy || '',
        lastUpdated: settings.privacyPolicyLastUpdated,
      };
    } catch (error) {
      throw new NotFoundException('Failed to retrieve privacy policy');
    }
  }

  /**
   * Get terms and conditions from settings
   */
  async getTermsAndConditions(userType: 'PASSENGER' | 'DRIVER' = 'PASSENGER'): Promise<{ termsAndConditions: string; lastUpdated?: Date }> {
    try {
      const settings = await this.settingsModel.findOne().exec();

      if (!settings) {
        return {
          termsAndConditions: '',
        };
      }

      if (userType === 'DRIVER') {
        return {
          termsAndConditions: settings.driverTermsAndConditions || '',
          lastUpdated: settings.driverTermsAndConditionsLastUpdated,
        };
      }

      return {
        termsAndConditions: settings.passengerTermsAndConditions || '',
        lastUpdated: settings.passengerTermsAndConditionsLastUpdated,
      };
    } catch (error) {
      throw new NotFoundException('Failed to retrieve terms and conditions');
    }
  }

  /**
   * Accept consent for user
   */
  async acceptConsent(
    userId: string,
    acceptConsentDto: AcceptConsentDto,
  ): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User Does Not Exist');
      }

      // Update the acceptConsent field
      const updatedUser = await this.userRepository2
        .findOneAndUpdate({ _id: userId }, { $set: { acceptConsent: acceptConsentDto.acceptConsent } }, { new: true })
        .select('-fcmToken');

      if (!updatedUser) {
        throw new Error('Failed to update consent');
      }

      return {
        success: true,
        message: 'Consent updated successfully',
        data: {
          acceptConsent: updatedUser.acceptConsent,
        },
      };
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Failed to update consent');
    }
  }
}
