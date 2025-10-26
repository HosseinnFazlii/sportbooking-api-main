import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base.controller';
import { Booking } from '../../entities/booking';
import { VBooking } from '../../entities/vBooking';
import { BookingService } from './booking.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { AddLineDto } from './dto/add-line.dto';
import { QuoteSlotDto } from './dto/quote-slot.dto';
import { ConfirmPaymentDto, FailPaymentDto } from './dto/payment.dto';

@ApiTags('booking')
@ApiBearerAuth()
@Controller('booking')
export class BookingController extends BaseController<Booking, VBooking> {
  constructor(private readonly bookings: BookingService) {
    super(bookings, 'booking', {
      permissions: {
        list: ['booking.read'],
        read: ['booking.read'],
        create: ['booking.create'],
        update: ['booking.update'],
        delete: ['booking.delete'],
      },
    });
  }

  @Post('hold')
  @ApiOperation({ summary: 'Create a hold booking (optionally with lines)' })
  createHold(@Body() dto: CreateHoldDto, @Req() req: any) {
    return this.bookings.createHold(dto, req.user);
  }

  @Get('places/:placeId/quote')
  @ApiOperation({ summary: 'Quote price for a specific slot' })
  quoteForSlot(@Param('placeId') placeId: number, @Query() dto: QuoteSlotDto) {
    return this.bookings.quote(+placeId, dto.startAt, dto.endAt);
  }

  @Get('places/:placeId/rate-card')
  @ApiOperation({ summary: 'Retrieve pricing profiles and overrides for a place' })
  rateCard(@Param('placeId') placeId: number) {
    return this.bookings.rateCard(+placeId);
  }

  @Get(':id/lines')
  @ApiOperation({ summary: 'List booking lines' })
  listLines(@Param('id') id: number) {
    return this.bookings.listLines(id);
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Add a line to booking' })
  addLine(@Param('id') id: number, @Body() dto: AddLineDto, @Req() req: any) {
    return this.bookings.addLine(id, dto, req.user);
  }

  @Delete(':id/lines/:lineId')
  @ApiOperation({ summary: 'Remove a line from booking' })
  removeLine(@Param('id') id: number, @Param('lineId') lineId: number, @Req() req: any) {
    return this.bookings.removeLine(id, lineId, req.user);
  }

  @Post(':id/initiate-payment')
  @ApiOperation({ summary: 'Initiate payment for a booking and lock totals' })
  initiatePayment(@Param('id') id: number, @Req() req: any) {
    return this.bookings.initiatePayment(id, req.user);
  }

  @Post(':id/payment/success')
  @ApiOperation({ summary: 'Mark a booking as paid/confirmed' })
  markPaid(@Param('id') id: number, @Body() dto: ConfirmPaymentDto, @Req() req: any) {
    return this.bookings.markPaymentSuccessful(id, dto.paymentReference, req.user);
  }

  @Post(':id/payment/failure')
  @ApiOperation({ summary: 'Mark a booking payment as failed' })
  markPaymentFailed(@Param('id') id: number, @Body() dto: FailPaymentDto, @Req() req: any) {
    return this.bookings.markPaymentFailed(id, dto.paymentReference, dto.reason, req.user);
  }

  @Put(':id/confirm')
  @ApiOperation({ summary: 'Confirm booking (makes it active regardless of hold)' })
  confirm(@Param('id') id: number, @Req() req: any) {
    return this.bookings.confirm(id, req.user);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking (non-active status / expire hold)' })
  cancel(@Param('id') id: number, @Req() req: any) {
    return this.bookings.cancel(id, req.user);
  }

  @Put(':id/reprice')
  @ApiOperation({ summary: 'Recompute totals from lines' })
  reprice(@Param('id') id: number) {
    return this.bookings.reprice(id);
  }
}
