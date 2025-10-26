import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../entities/booking';
import { BookingLine } from '../../entities/bookingLine';
import { BookingStatus } from '../../entities/bookingStatus';
import { Place } from '../../entities/place';
import { PlacePricingProfile } from '../../entities/placePricingProfile';
import { PlacePriceRule } from '../../entities/placePriceRule';
import { Calendar } from '../../entities/calendar';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PricingService } from './pricing.service';
import { VBooking } from '../../entities/vBooking';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, BookingLine, BookingStatus, Place, PlacePricingProfile, PlacePriceRule, Calendar, VBooking])],
  providers: [BookingService, PricingService],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
