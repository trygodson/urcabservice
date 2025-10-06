import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PassengerDocument, User, UserDocument } from '@urcab-workspace/shared';
import { AbstractRepository } from '@urcab-workspace/shared';

@Injectable()
export class PassengerDocumentRepository extends AbstractRepository<PassengerDocument> {
  protected readonly logger = new Logger(PassengerDocument.name);

  constructor(
    @InjectModel(PassengerDocument.name)
    reservationModel: Model<PassengerDocument>,
  ) {
    super(reservationModel);
  }
}
