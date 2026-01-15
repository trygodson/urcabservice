import { ApiProperty } from '@nestjs/swagger';

export class SettingsResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  privacyPolicy: string;

  @ApiProperty()
  termsAndConditions: string;

  @ApiProperty({ required: false })
  globalVehicleEvpPrice?: number;

  @ApiProperty({ required: false })
  globalVehicleEvpPeriod?: number;

  @ApiProperty({ required: false })
  privacyPolicyLastUpdated?: Date;

  @ApiProperty({ required: false })
  termsAndConditionsLastUpdated?: Date;

  @ApiProperty({ required: false })
  evpPriceLastUpdated?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

