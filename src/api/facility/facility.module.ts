import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Facility } from '../../entities/facility';
import { Place } from '../../entities/place';
import { PlaceWorkingHour } from '../../entities/placeWorkingHour';
import { FacilityStaff } from '../../entities/facilityStaff';
import { User } from '../../entities/user';
import { PlacePricingProfile } from '../../entities/placePricingProfile';
import { PlacePriceRule } from '../../entities/placePriceRule';
import { VFacility } from '../../entities/vFacility';
import { FacilityService } from './facility.service';
import { FacilityController } from './facility.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Facility, Place, PlaceWorkingHour, FacilityStaff, User, PlacePricingProfile, PlacePriceRule, VFacility])],
  providers: [FacilityService],
  controllers: [FacilityController],
  exports: [FacilityService],
})
export class FacilityModule {}
