import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveWithdrawalDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}

export class RejectWithdrawalDto {
  @ApiProperty({ required: true })
  @IsString()
  @MaxLength(500)
  rejectionReason: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}
