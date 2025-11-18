import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from './abstract.repository';
import { Rating, RatingDocument } from '@urcab-workspace/shared';

@Injectable()
export class AdminPassengerRatingRepository extends AbstractRepository<RatingDocument> {
  constructor(@InjectModel(Rating.name) ratingModel: Model<RatingDocument>) {
    super(ratingModel);
  }
}
