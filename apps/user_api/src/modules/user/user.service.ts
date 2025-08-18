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
      return await this.userRepository.findOne({
        _id,
      });
    } catch (error) {
      throw new UnauthorizedException('User Does Not Exist');
    }
  }
}
