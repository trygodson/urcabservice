import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { PaymentMethod } from '@urcab-workspace/shared';

export class PayEvpDto {
  @ApiProperty({
    description: 'Payment method for EVP',
    enum: PaymentMethod,
    example: PaymentMethod.WALLET,
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

