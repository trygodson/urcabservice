import { Length } from 'class-validator';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '@urcab-workspace/shared';

import { plainToInstance } from 'class-transformer';
import * as moment from 'moment';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUser({ _id }) {
    try {
      const dd = await this.userRepository.findById(_id, []);

      if (dd) {
        return {
          success: true,
          data: dd,
        };
      }
    } catch (error) {
      throw new UnauthorizedException('User Does Not Exist');
    }
  }
}
