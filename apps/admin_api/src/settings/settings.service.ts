import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Settings, SettingsDocument } from '@urcab-workspace/shared';
import { UpdatePrivacyPolicyDto, UpdateTermsConditionsDto, UpdateEvpPriceDto, SettingsResponseDto } from './dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(@InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>) {}

  /**
   * Get or create settings document (singleton pattern)
   */
  private async getOrCreateSettings(): Promise<SettingsDocument> {
    let settings = await this.settingsModel.findOne().exec();

    if (!settings) {
      settings = await this.settingsModel.create({
        _id: new Types.ObjectId(),
        privacyPolicy: '',
        termsAndConditions: '',
        globalVehicleEvpPrice: 0,
        globalVehicleEvpPeriod: 365, // Default to 1 year
      });
      this.logger.log('Created initial settings document');
    }

    return settings;
  }

  async getSettings(): Promise<SettingsResponseDto> {
    const settings = await this.getOrCreateSettings();

    return {
      _id: settings._id.toString(),
      privacyPolicy: settings.privacyPolicy || '',
      termsAndConditions: settings.termsAndConditions || '',
      globalVehicleEvpPrice: settings.globalVehicleEvpPrice,
      globalVehicleEvpPeriod: settings.globalVehicleEvpPeriod,
      privacyPolicyLastUpdated: settings.privacyPolicyLastUpdated,
      termsAndConditionsLastUpdated: settings.termsAndConditionsLastUpdated,
      evpPriceLastUpdated: settings.evpPriceLastUpdated,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async updatePrivacyPolicy(updateDto: UpdatePrivacyPolicyDto): Promise<SettingsResponseDto> {
    const settings = await this.getOrCreateSettings();

    const updated = await this.settingsModel.findOneAndUpdate(
      { _id: settings._id },
      {
        privacyPolicy: updateDto.privacyPolicy,
        privacyPolicyLastUpdated: new Date(),
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Settings not found');
    }

    this.logger.log('Privacy policy updated');

    return {
      _id: updated._id.toString(),
      privacyPolicy: updated.privacyPolicy,
      termsAndConditions: updated.termsAndConditions,
      globalVehicleEvpPrice: updated.globalVehicleEvpPrice,
      globalVehicleEvpPeriod: updated.globalVehicleEvpPeriod,
      privacyPolicyLastUpdated: updated.privacyPolicyLastUpdated,
      termsAndConditionsLastUpdated: updated.termsAndConditionsLastUpdated,
      evpPriceLastUpdated: updated.evpPriceLastUpdated,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updateTermsAndConditions(updateDto: UpdateTermsConditionsDto): Promise<SettingsResponseDto> {
    const settings = await this.getOrCreateSettings();

    const updated = await this.settingsModel.findOneAndUpdate(
      { _id: settings._id },
      {
        termsAndConditions: updateDto.termsAndConditions,
        termsAndConditionsLastUpdated: new Date(),
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Settings not found');
    }

    this.logger.log('Terms and Conditions updated');

    return {
      _id: updated._id.toString(),
      privacyPolicy: updated.privacyPolicy,
      termsAndConditions: updated.termsAndConditions,
      globalVehicleEvpPrice: updated.globalVehicleEvpPrice,
      globalVehicleEvpPeriod: updated.globalVehicleEvpPeriod,
      privacyPolicyLastUpdated: updated.privacyPolicyLastUpdated,
      termsAndConditionsLastUpdated: updated.termsAndConditionsLastUpdated,
      evpPriceLastUpdated: updated.evpPriceLastUpdated,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updateEvpPrice(updateDto: UpdateEvpPriceDto): Promise<SettingsResponseDto> {
    const settings = await this.getOrCreateSettings();

    const updated = await this.settingsModel.findOneAndUpdate(
      { _id: settings._id },
      {
        globalVehicleEvpPrice: updateDto.globalVehicleEvpPrice,
        globalVehicleEvpPeriod: updateDto.globalVehicleEvpPeriod,
        evpPriceLastUpdated: new Date(),
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Settings not found');
    }

    this.logger.log(
      `Global EVP price updated to ${updateDto.globalVehicleEvpPrice} with period of ${updateDto.globalVehicleEvpPeriod} days`,
    );

    return {
      _id: updated._id.toString(),
      privacyPolicy: updated.privacyPolicy,
      termsAndConditions: updated.termsAndConditions,
      globalVehicleEvpPrice: updated.globalVehicleEvpPrice,
      globalVehicleEvpPeriod: updated.globalVehicleEvpPeriod,
      privacyPolicyLastUpdated: updated.privacyPolicyLastUpdated,
      termsAndConditionsLastUpdated: updated.termsAndConditionsLastUpdated,
      evpPriceLastUpdated: updated.evpPriceLastUpdated,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Get global EVP price from settings
   */
  async getGlobalEvpPrice(): Promise<number> {
    const settings = await this.getOrCreateSettings();
    return settings.globalVehicleEvpPrice || 0;
  }
}
