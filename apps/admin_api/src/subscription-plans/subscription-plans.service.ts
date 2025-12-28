import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { SubscriptionPlanRepository, SubscriptionType } from '@urcab-workspace/shared';
import { CreateSubscriptionPlanDto, UpdateSubscriptionPlanDto, SubscriptionPlanResponseDto } from './dto';
import { Types } from 'mongoose';

@Injectable()
export class SubscriptionPlansService {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(private readonly subscriptionPlanRepository: SubscriptionPlanRepository) {}

  async create(createPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanResponseDto> {
    // Validate that only daily, weekly, or monthly plans can be created
    const allowedTypes = [SubscriptionType.DAILY, SubscriptionType.WEEKLY, SubscriptionType.MONTHLY];
    if (!allowedTypes.includes(createPlanDto.type)) {
      throw new BadRequestException('Only daily, weekly, or monthly subscription plans are allowed');
    }

    // Check if a plan of this type already exists
    const existingPlan = await this.subscriptionPlanRepository.planTypeExists(createPlanDto.type);
    if (existingPlan) {
      throw new ConflictException(`A ${createPlanDto.type} subscription plan already exists`);
    }

    // Validate validity matches type
    this.validateValidityForType(createPlanDto.type, createPlanDto.validity);

    const plan = await this.subscriptionPlanRepository.model.create({
      _id: new Types.ObjectId(),
      ...createPlanDto,
      status: createPlanDto.status || 'active',
      isActive: true,
    });

    return this.mapToResponseDto(plan);
  }

  async findAll(): Promise<SubscriptionPlanResponseDto[]> {
    const plans = await this.subscriptionPlanRepository.findAll();
    return plans.map((plan) => this.mapToResponseDto(plan));
  }

  async findActivePlans(): Promise<SubscriptionPlanResponseDto[]> {
    const plans = await this.subscriptionPlanRepository.findActivePlans();
    return plans.map((plan) => this.mapToResponseDto(plan));
  }

  async findOne(id: string): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.subscriptionPlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }
    return this.mapToResponseDto(plan);
  }

  async findByType(type: SubscriptionType): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.subscriptionPlanRepository.findByType(type);
    if (!plan) {
      throw new NotFoundException(`Subscription plan with type ${type} not found`);
    }
    return this.mapToResponseDto(plan);
  }

  async update(id: string, updatePlanDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.subscriptionPlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }

    // If type is being changed, validate it's still one of the allowed types
    if (updatePlanDto.validity !== undefined) {
      this.validateValidityForType(plan.type as SubscriptionType, updatePlanDto.validity);
    }

    // If updating type, check if another plan of that type exists
    // Note: We don't allow changing type in update, but if we did, we'd check here

    await this.subscriptionPlanRepository.findOneAndUpdate({ _id: id }, updatePlanDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.subscriptionPlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }

    // Soft delete by setting isActive to false
    await this.subscriptionPlanRepository.findOneAndUpdate({ _id: id }, { isActive: false });
  }

  private validateValidityForType(type: SubscriptionType, validity: number): void {
    const expectedValidity: Record<SubscriptionType, number> = {
      [SubscriptionType.FREE]: 0,
      [SubscriptionType.DAILY]: 1,
      [SubscriptionType.WEEKLY]: 7,
      [SubscriptionType.MONTHLY]: 30,
    };

    if (expectedValidity[type] !== validity) {
      throw new BadRequestException(
        `Validity for ${type} plan must be ${expectedValidity[type]} day(s), but got ${validity}`,
      );
    }
  }

  private mapToResponseDto(plan: any): SubscriptionPlanResponseDto {
    return {
      _id: plan._id.toString(),
      name: plan.name,
      price: plan.price,
      description: plan.description,
      validity: plan.validity,
      type: plan.type,
      status: plan.status,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
