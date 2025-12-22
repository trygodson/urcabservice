import { ApiProperty } from '@nestjs/swagger';

export class PermissionDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: string;
}

export class UserPermissionsResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  roleId: string | null;

  @ApiProperty()
  roleName: string | null;

  @ApiProperty()
  isSuperAdmin: boolean;

  @ApiProperty({ type: [PermissionDto] })
  permissions: PermissionDto[];
}

