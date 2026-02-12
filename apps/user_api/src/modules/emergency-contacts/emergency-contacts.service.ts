import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EmergencyContactRepository } from '@urcab-workspace/shared';
import { CreateEmergencyContactDto, EmergencyContactResponseDto, UpdateEmergencyContactDto } from './dto';

@Injectable()
export class EmergencyContactsService {
  private readonly MAX_CONTACTS = 3;

  constructor(private readonly emergencyContactRepository: EmergencyContactRepository) {}

  /**
   * Create a new emergency contact for a user
   */
  async create(userId: string, dto: CreateEmergencyContactDto): Promise<EmergencyContactResponseDto> {
    // Enforce maximum contacts per user
    const activeCount = await this.emergencyContactRepository.countActiveContacts(userId);
    if (activeCount >= this.MAX_CONTACTS) {
      throw new BadRequestException(`You can only add up to ${this.MAX_CONTACTS} emergency contacts`);
    }

    // Ensure phone number is unique per user
    const isUnique = await this.emergencyContactRepository.isPhoneNumberUnique(userId, dto.phoneNumber);
    if (!isUnique) {
      throw new ConflictException('This phone number is already registered as an emergency contact');
    }

    const contact = await this.emergencyContactRepository.create({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      relationship: dto.relationship,
      isPrimary: activeCount === 0, // first contact becomes primary
    } as any);

    return this.toResponse(contact);
  }

  /**
   * Get all active emergency contacts for a user
   */
  async list(userId: string): Promise<EmergencyContactResponseDto[]> {
    const contacts = await this.emergencyContactRepository.findByUserId(userId);
    return contacts.map((c) => this.toResponse(c));
  }

  /**
   * Delete (soft-delete) an emergency contact for a user
   */
  async remove(userId: string, contactId: string): Promise<{ success: boolean }> {
    const contact = await this.emergencyContactRepository.findOneWithDocument({
      _id: new Types.ObjectId(contactId),
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    await this.emergencyContactRepository.findOneAndDelete(
      { _id: new Types.ObjectId(contactId), userId: new Types.ObjectId(userId) },
      // { isActive: false },
    );

    return { success: true };
  }
  async update(userId: string, contactId: string, dto: UpdateEmergencyContactDto): Promise<{ success: boolean }> {
    const contact = await this.emergencyContactRepository.findOneWithDocument({
      _id: new Types.ObjectId(contactId),
      userId: new Types.ObjectId(userId),
      // isActive: true,
    });

    if (!contact) {
      throw new NotFoundException('Emergency contact not found');
    }

    await this.emergencyContactRepository.findOneAndUpdate(
      { _id: new Types.ObjectId(contactId), userId: new Types.ObjectId(userId) },
      { name: dto.name, phoneNumber: dto.phoneNumber, relationship: dto.relationship },
    );

    return { success: true };
  }

  private toResponse(contact: any): EmergencyContactResponseDto {
    return {
      _id: contact._id.toString(),
      name: contact.name,
      phoneNumber: contact.phoneNumber,
    };
  }
}
