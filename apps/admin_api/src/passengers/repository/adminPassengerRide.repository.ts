import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from './abstract.repository';
import { Ride, RideDocument } from '@urcab-workspace/shared';

@Injectable()
export class AdminPassengerRideRepository extends AbstractRepository<RideDocument> {
  constructor(@InjectModel(Ride.name) rideModel: Model<RideDocument>) {
    super(rideModel);
  }
}
