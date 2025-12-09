import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  EmergencyContact,
  EmergencyContactRepository,
  EmergencyContactSchema,
} from '@urcab-workspace/shared';
import { EmergencyContactsController } from './emergency-contacts.controller';
import { EmergencyContactsService } from './emergency-contacts.service';

@Module({
  imports: [DatabaseModule.forFeature([{ name: EmergencyContact.name, schema: EmergencyContactSchema }])],
  controllers: [EmergencyContactsController],
  providers: [EmergencyContactsService, EmergencyContactRepository],
  exports: [EmergencyContactsService],
})
export class EmergencyContactsModule {}
