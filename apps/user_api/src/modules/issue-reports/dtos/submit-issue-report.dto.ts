import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  MaxLength,
  Min,
  Max,
  IsArray,
  IsDateString,
} from 'class-validator';
import { IssueType } from '@urcab-workspace/shared';

export class SubmitIssueReportDto {
  @ApiProperty({
    description: 'The ride ID for which the issue is being reported',
    example: '60d0fe4f5311236168a109ca',
  })
  @IsMongoId()
  @IsNotEmpty()
  rideId: string;

  @ApiProperty({
    description: 'The user ID being reported (usually driver)',
    example: '60d0fe4f5311236168a109cb',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  reportedUserId?: string;

  @ApiProperty({
    description: 'Type of issue being reported',
    enum: IssueType,
    example: IssueType.DRIVER_BEHAVIOR,
  })
  @IsEnum(IssueType)
  @IsNotEmpty()
  issueType: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'The driver was driving recklessly and not following traffic rules.',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  // @ApiProperty({
  //   description: 'Location where the incident occurred',
  //   required: false,
  //   // type: () => IncidentLocationDto,
  // })
  // @IsOptional()
  // incidentLocation?: {
  //   latitude?: number;
  //   longitude?: number;
  //   address?: string;
  // };

  @ApiProperty({
    description: 'Whether the report should be anonymous to the reported user',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
