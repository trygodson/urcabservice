import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { EmergencyContact, EmergencyContactDocument } from '../models';

@Injectable()
export class EmergencyContactRepository extends AbstractRepository<EmergencyContactDocument> {
  protected readonly logger = new Logger(EmergencyContactRepository.name);

  constructor(@InjectModel(EmergencyContact.name) emergencyContactModel: Model<EmergencyContactDocument>) {
    super(emergencyContactModel);
  }

  /**
   * Find all emergency contacts for a user
   */
  async findByUserId(userId: string): Promise<EmergencyContactDocument[]> {
    return this.find({ userId, isActive: true });
  }

  /**
   * Find primary emergency contact for a user
   */
  async findPrimaryContact(userId: string): Promise<EmergencyContactDocument | null> {
    return this.findOne({ userId, isPrimary: true, isActive: true });
  }

  /**
   * Set primary contact (ensures only one primary contact per user)
   */
  async setPrimaryContact(userId: string, contactId: string): Promise<EmergencyContactDocument> {
    // First, remove primary status from all other contacts for this user
    await this.model.updateMany({ userId, _id: { $ne: contactId } }, { isPrimary: false }).exec();

    // Then set the specified contact as primary
    return this.findOneAndUpdate({ _id: contactId, userId }, { isPrimary: true, isActive: true });
  }

  /**
   * Find contacts that should be notified on ride start
   */
  async findContactsForRideNotification(userId: string): Promise<EmergencyContactDocument[]> {
    return this.find({
      userId,
      isActive: true,
      notifyOnRideStart: true,
    });
  }

  /**
   * Find contacts that should be notified in emergency
   */
  async findContactsForEmergency(userId: string): Promise<EmergencyContactDocument[]> {
    return this.find({
      userId,
      isActive: true,
      notifyOnEmergency: true,
    });
  }

  /**
   * Find contacts that should be notified on late arrival
   */
  async findContactsForLateArrival(userId: string): Promise<EmergencyContactDocument[]> {
    return this.find({
      userId,
      isActive: true,
      notifyOnLateArrival: true,
    });
  }

  /**
   * Count active emergency contacts for a user
   */
  async countActiveContacts(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, isActive: true }).exec();
  }

  /**
   * Deactivate all contacts for a user
   */
  async deactivateAllContacts(userId: string): Promise<void> {
    await this.model.updateMany({ userId }, { isActive: false }).exec();
  }

  /**
   * Validate phone number uniqueness for a user
   */
  async isPhoneNumberUnique(userId: string, phoneNumber: string, excludeId?: string): Promise<boolean> {
    const query: any = { userId, phoneNumber };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingContact = await this.findOne(query);
    return !existingContact;
  }

  /**
   * Find contacts by relationship type
   */
  async findByRelationship(userId: string, relationship: string): Promise<EmergencyContactDocument[]> {
    return this.find({
      userId,
      relationship,
      isActive: true,
    });
  }
}
