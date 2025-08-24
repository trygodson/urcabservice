import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { Types } from 'mongoose';
import { JwtDVerify, JwtVerify } from '@urcab-workspace/shared';

@Injectable()
export class JwtDStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: AuthService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          return (
            request?.headers?.authorization &&
            request?.headers?.authorization.split(' ')[1] &&
            this.jwtService.sign(JwtDVerify(request?.headers?.authorization.split(' ')[1]).data, {
              expiresIn: `${this.configService.get('JWT_EXPIRATION')}d`,
            })
          );
        },
      ]),

      secretOrKey: configService.get('JWT_DSECRET'),
    });
  }

  async validate(dd: { user_id: number; email: string }) {
    // console.log('JWT payload:', dd);

    try {
      const user = await this.usersService.getUser({
        _id: new Types.ObjectId(dd.user_id),
      });

      // console.log('User found in JWT strategy:', user);

      return user;
    } catch (error) {
      console.error('JWT validation error:', error);
      throw new UnauthorizedException(error);
    }
  }
}
