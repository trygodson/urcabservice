import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class SettingsResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  privacyPolicy: string;

  @ApiProperty()
  passengerTermsAndConditions: string;

  @ApiProperty()
  driverTermsAndConditions: string;

  @ApiProperty({ required: false })
  globalVehicleEvpPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  globalVehicleEvpPeriod?: number;

  @ApiProperty({ required: false })
  privacyPolicyLastUpdated?: Date;

  @ApiProperty({ required: false })
  passengerTermsAndConditionsLastUpdated?: Date;

  @ApiProperty({ required: false })
  driverTermsAndConditionsLastUpdated?: Date;

  @ApiProperty({ required: false })
  evpPriceLastUpdated?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
