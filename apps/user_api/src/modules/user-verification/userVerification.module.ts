import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassengerDocument, PassengerDocumentSchema } from '@urcab-workspace/shared';
import { UserDocumentController } from './userVerification.controller';
import { NRICVerificationService } from './nricVerificationService';
import { PassportVerificationService } from './passportVerification.service';
import { DocumentVerificationStatusService } from './documentVerificationStatus.service';
import { PassengerDocumentRepository } from './repository/passenger-document.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: PassengerDocument.name, schema: PassengerDocumentSchema }])],
  controllers: [UserDocumentController],
  providers: [
    NRICVerificationService,
    PassportVerificationService,
    DocumentVerificationStatusService,
    // PassengerDocumentRepository,
  ],
  exports: [NRICVerificationService, PassportVerificationService, DocumentVerificationStatusService],
})
export class UserVerificationModule {}
