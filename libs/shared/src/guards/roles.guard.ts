import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { JwtVerify } from '../auth';
import { Role } from '../enums';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../constants';

interface CustomRequest extends Request {
  sessionAuth: { [unit: string]: any };
}
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    const is_public = this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler());

    if (is_public) {
      return is_public;
    }

    const requiredRoles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler());

    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // User object from JWT strategy

    console.log(user, 'the user object');

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
