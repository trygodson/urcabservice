import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { RefreshToken } from '../models';

@Injectable()
export class RefreshTokenRepository extends AbstractRepository<RefreshToken> {
  protected readonly logger = new Logger(RefreshTokenRepository.name);

  constructor(
    @InjectModel(RefreshToken.name)
    reservationModel: Model<RefreshToken>,
  ) {
    super(reservationModel);
  }
}
