import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums';
import { IS_PUBLIC_KEY, IS_PUBOPEN_KEY, ROLES_KEY } from '../constants';

export const SetRolesMetaData = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
