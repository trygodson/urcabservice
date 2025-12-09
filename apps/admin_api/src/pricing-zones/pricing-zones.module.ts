import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule, PricingZone, PricingZoneSchema } from '@urcab-workspace/shared';
import { PricingZonesController } from './pricing-zones.controller';
import { PricingZonesService } from './pricing-zones.service';
import { AdminPricingZoneRepository } from './repository/adminPricingZone.repository';

@Module({
  imports: [DatabaseModule.forFeature([{ name: PricingZone.name, schema: PricingZoneSchema }]), HttpModule],
  controllers: [PricingZonesController],
  providers: [PricingZonesService, AdminPricingZoneRepository],
  exports: [PricingZonesService],
})
export class PricingZonesModule {}
