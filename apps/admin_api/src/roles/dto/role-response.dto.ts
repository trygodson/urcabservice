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
}

export class RoleResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({ type: [PermissionResponseDto] })
  permissions: PermissionResponseDto[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isSystemRole: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

