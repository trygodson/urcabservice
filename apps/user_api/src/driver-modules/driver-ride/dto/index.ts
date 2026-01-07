import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class AddTollAmountDto {
  @ApiPropertyOptional({
    description: 'Tip amount to add to the ride fare (in RM)',
    example: 5.0,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tip must be a number' })
  @Min(0, { message: 'Tip must be a non-negative number' })
  tollAmount?: number;
}
