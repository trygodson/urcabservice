import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Role } from '../enums';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../constants';
import { User } from '../models';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  override canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const is_public = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (is_public) {
      return is_public;
    }

    return super.canActivate(context);
  }

  override handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException();
      // if (
      //   context.switchToHttp().getRequest().url.includes('/stagedElection/getStageOneCandidateList') ||
      //   context.switchToHttp().getRequest().url.includes('/stagedElection/getStageTwoCandidateList') ||
      //   context.switchToHttp().getRequest().url.includes('/stagedElection/getStageThreeCandidateList') ||
      //   context.switchToHttp().getRequest().url.includes('/singleElection/getSingleElectionCandidateList') ||
      //   context.switchToHttp().getRequest().url.includes('/stagedElection/getStageOneDetails') ||
      //   context.switchToHttp().getRequest().url.includes('/stagedElection/getStageTwoDetails') ||
      //   context.switchToHttp().getRequest().url.includes('/stagedElection/getStageThreeDetails') ||
      //   context.switchToHttp().getRequest().url.includes('/stagedElection/voteStagedCandidateInElection')
      // ) {
      //   return false;
      // } else {
      //
      // }
    }
    const requiredRoles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    if (requiredRoles.some((role) => user.type === role)) {
      if (user.isDeleted) throw new UnauthorizedException('Account Has Been Deleted, Beg Us!!!');
      if (!user.isActive)
        throw new UnauthorizedException('Account Has Been DeActivated, Contact Support For Assistance');
      return user;
    } else {
      throw new UnauthorizedException('Not Your Specs');
    }
    // return user;
  }
}
