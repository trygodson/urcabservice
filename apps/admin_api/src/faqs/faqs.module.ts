import { Module } from '@nestjs/common';
import { DatabaseModule, Faq, FaqSchema } from '@urcab-workspace/shared';
import { FaqsController } from './faqs.controller';
import { FaqsService } from './faqs.service';
import { AdminFaqRepository } from './repository/adminFaq.repository';

@Module({
  imports: [DatabaseModule.forFeature([{ name: Faq.name, schema: FaqSchema }])],
  controllers: [FaqsController],
  providers: [FaqsService, AdminFaqRepository],
  exports: [FaqsService],
})
export class FaqsModule {}

