import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

