import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../database';
import { User, UserDocument } from '../models';

@Injectable()
export class UserRepository extends AbstractRepository<User> {
  protected readonly logger = new Logger(UserRepository.name);

  constructor(
    @InjectModel(User.name)
    reservationModel: Model<User>,
  ) {
    super(reservationModel);
  }

  async findDriverByIdWithDriverLocation(userId: string): Promise<User> {
    return this.model.findOne({ _id: userId }).populate('driverLocation').exec();
  }
}
