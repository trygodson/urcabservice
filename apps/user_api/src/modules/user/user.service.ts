import { Length } from 'class-validator';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  UpdateDriverProfileDto,
  updateFCMDto,
  AcceptConsentDto,
  ChangePasswordDto,
  User,
  UserRepository,
  Settings,
  SettingsDocument,
  Faq,
  FaqDocument,
} from '@urcab-workspace/shared';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentVerificationStatusService } from '../user-verification/documentVerificationStatus.service';
import * as md5 from 'md5';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class UserService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    @InjectModel(User.name) private readonly userRepository2: Model<User>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>,
    @InjectModel(Faq.name) private readonly faqModel: Model<FaqDocument>,
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
  async getTermsAndConditions(
    userType: 'PASSENGER' | 'DRIVER' = 'PASSENGER',
  ): Promise<{ termsAndConditions: string; lastUpdated?: Date }> {
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

  /**
   * Change password for user
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get user with password fields
      const user = await this.userRepository.findOne({ _id: new Types.ObjectId(userId) }, [], {
        select: 'passwordSalt passwordHash email',
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const currentPasswordHash = await bcrypt.hash(changePasswordDto.currentPassword, user.passwordSalt);
      if (currentPasswordHash !== user.passwordHash) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Check if new password is same as current password
      const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, user.passwordSalt);
      if (newPasswordHash === user.passwordHash) {
        throw new BadRequestException('New password must be different from current password');
      }

      // Generate new salt and hash for new password
      const newPassSalt = await bcrypt.genSalt();
      const newPasswordHashWithNewSalt = await bcrypt.hash(changePasswordDto.newPassword, newPassSalt);

      // Update password
      await this.userRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(userId) },
        {
          passwordHash: newPasswordHashWithNewSalt,
          passwordSalt: newPassSalt,
        },
      );

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to change password');
    }
  }

  /**
   * Get paginated FAQs (only active ones)
   */
  async getFaqs(query: { page?: number; limit?: number; search?: string; category?: string }) {
    try {
      const { page = 1, limit = 10, search, category } = query;
      const skip = (page - 1) * limit;

      // Build filter - only active FAQs
      const filter: any = {
        isActive: true,
      };

      if (search) {
        filter.$or = [{ question: { $regex: search, $options: 'i' } }, { answer: { $regex: search, $options: 'i' } }];
      }

      if (category) {
        filter.category = category;
      }

      // Get FAQs with pagination, sorted by order then createdAt
      const faqs = await this.faqModel
        .find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      const total = await this.faqModel.countDocuments(filter);

      return {
        success: true,
        data: {
          faqs: faqs.map((faq: any) => ({
            _id: faq._id,
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            order: faq.order,
            viewCount: faq.viewCount,
            createdAt: faq.createdAt,
            updatedAt: faq.updatedAt,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to retrieve FAQs');
    }
  }
}
