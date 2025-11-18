import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from './abstract.repository';
import { PassengerDocument, PassengerDocumentDocument } from '@urcab-workspace/shared';

@Injectable()
export class AdminPassengerDocumentRepository extends AbstractRepository<PassengerDocumentDocument> {
  constructor(@InjectModel(PassengerDocument.name) documentModel: Model<PassengerDocumentDocument>) {
    super(documentModel);
  }
}
