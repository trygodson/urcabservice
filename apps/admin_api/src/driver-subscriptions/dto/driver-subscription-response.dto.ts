import { ApiProperty } from '@nestjs/swagger';

export class DriverSubscriptionResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  driverId: string;

  @ApiProperty({ required: false })
  planId?: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  price: number;

  @ApiProperty({ required: false })
  paymentMethod?: string;

  @ApiProperty({ required: false })
  paymentReference?: string;

  @ApiProperty({ required: false })
  paymentDate?: Date;

  @ApiProperty({ required: false })
  approvedByAdminId?: string;

  @ApiProperty({ required: false })
  approvedAt?: Date;

  @ApiProperty()
  autoRenew: boolean;

  @ApiProperty()
  ridesCompleted: number;

  @ApiProperty()
  totalEarnings: number;

  @ApiProperty({ required: false })
  lastActiveDate?: Date;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  discountPercentage?: number;

  @ApiProperty({ required: false })
  discountReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

