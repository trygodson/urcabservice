import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriptionPlanWithStatusDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  validity: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isActive?: boolean;

  @ApiProperty()
  isDriverActive: boolean; // Whether this driver has an active subscription for this plan

  @ApiPropertyOptional()
  activeSubscriptionId?: string; // ID of the active subscription if driver has one

  @ApiPropertyOptional()
  expiryDate?: Date; // Expiry date of the active subscription

  @ApiPropertyOptional()
  startDate?: Date; // Start date of the active subscription

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;
}

export class SubscriptionPlansListResponseDto {
  @ApiProperty({ type: [SubscriptionPlanWithStatusDto] })
  plans: SubscriptionPlanWithStatusDto[];

  @ApiPropertyOptional()
  activeSubscription?: {
    _id: string;
    planId: string | null;
    planName: string;
    startDate: Date;
    endDate: Date;
    expiryDate: Date;
    price: number;
    status: string;
    dailyRideRequests?: number;
    dailyLimit?: number;
    remainingRequests?: number;
  };
}
