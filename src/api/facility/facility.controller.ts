import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base.controller';
import { Facility } from '../../entities/facility';
import { VFacility } from '../../entities/vFacility';
import { FacilityService } from './facility.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { UpsertPlaceHoursDto } from './dto/upsert-place-hours.dto';
import { AddStaffDto } from './dto/add-staff.dto';
import { CreatePricingProfileDto } from './dto/create-pricing-profile.dto';
import { UpdatePricingProfileDto } from './dto/update-pricing-profile.dto';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';

@ApiTags('facility')
@ApiBearerAuth()
@Controller('facility')
export class FacilityController extends BaseController<Facility, VFacility> {
  constructor(private readonly facilities: FacilityService) {
    super(facilities, 'facility', {
      permissions: {
        list: ['facility.read'],
        read: ['facility.read'],
        create: ['facility.create'],
        update: ['facility.update'],
        delete: ['facility.delete'],
      },
    });
  }

  @Get()
  override findAll(@Query() query: any, @Req() request: any) { return super.findAll(query, request); }

  @Get(':id')
  override findOne(@Param('id') id: number, @Req() request: any) { return super.findOne(id, request); }

  // Places
  @Get(':id/places')
  listPlaces(@Param('id') id: number, @Req() req: any) { return this.facilities.listPlaces(+id, req.user); }

  @Post(':id/places')
  createPlace(@Param('id') id: number, @Body() dto: CreatePlaceDto, @Req() req: any) {
    return this.facilities.createPlace(+id, dto, req.user);
  }

  @Put(':id/places/:placeId')
  updatePlace(@Param('id') id: number, @Param('placeId') placeId: number, @Body() dto: UpdatePlaceDto, @Req() req: any) {
    return this.facilities.updatePlace(+id, +placeId, dto, req.user);
  }

  @Delete(':id/places/:placeId')
  deletePlace(@Param('id') id: number, @Param('placeId') placeId: number, @Req() req: any) {
    return this.facilities.deletePlace(+id, +placeId, req.user);
  }

  // Place hours
  @Get(':id/places/:placeId/hours')
  listHours(@Param('id') id: number, @Param('placeId') placeId: number, @Req() req: any) {
    return this.facilities.listPlaceHours(+id, +placeId, req.user);
  }

  @Post(':id/places/:placeId/hours')
  upsertHour(@Param('id') id: number, @Param('placeId') placeId: number, @Body() dto: UpsertPlaceHoursDto, @Req() req: any) {
    return this.facilities.upsertPlaceHour(+id, +placeId, dto, req.user);
  }

  @Delete(':id/places/:placeId/hours/:weekday/:segmentNo')
  deleteHour(
    @Param('id') id: number,
    @Param('placeId') placeId: number,
    @Param('weekday') weekday: number,
    @Param('segmentNo') segmentNo: number,
    @Req() req: any,
  ) {
    return this.facilities.deletePlaceHour(+id, +placeId, +weekday, +segmentNo, req.user);
  }

  // Place pricing profiles
  @Get(':id/places/:placeId/pricing-profiles')
  @ApiOperation({ summary: 'List pricing profiles for a place' })
  listPricingProfiles(@Param('id') id: number, @Param('placeId') placeId: number, @Req() req: any) {
    return this.facilities.listPricingProfiles(+id, +placeId, req.user);
  }

  @Post(':id/places/:placeId/pricing-profiles')
  @ApiOperation({ summary: 'Create a pricing profile for a place' })
  createPricingProfile(
    @Param('id') id: number,
    @Param('placeId') placeId: number,
    @Body() dto: CreatePricingProfileDto,
    @Req() req: any,
  ) {
    return this.facilities.createPricingProfile(+id, +placeId, dto, req.user);
  }

  @Put(':id/places/:placeId/pricing-profiles/:profileId')
  @ApiOperation({ summary: 'Update a pricing profile' })
  updatePricingProfile(
    @Param('id') id: number,
    @Param('placeId') placeId: number,
    @Param('profileId') profileId: number,
    @Body() dto: UpdatePricingProfileDto,
    @Req() req: any,
  ) {
    return this.facilities.updatePricingProfile(+id, +placeId, +profileId, dto, req.user);
  }

  @Delete(':id/places/:placeId/pricing-profiles/:profileId')
  @ApiOperation({ summary: 'Archive (soft-delete) a pricing profile' })
  deletePricingProfile(
    @Param('id') id: number,
    @Param('placeId') placeId: number,
    @Param('profileId') profileId: number,
    @Req() req: any,
  ) {
    return this.facilities.deletePricingProfile(+id, +placeId, +profileId, req.user);
  }

  // Place pricing rules
  @Get(':id/places/:placeId/pricing-profiles/:profileId/rules')
  @ApiOperation({ summary: 'List price rules for a pricing profile' })
  listPricingRules(
    @Param('id') id: number,
    @Param('placeId') placeId: number,
    @Param('profileId') profileId: number,
    @Req() req: any,
  ) {
    return this.facilities.listPricingRules(+id, +placeId, +profileId, req.user);
  }

  @Post(':id/places/:placeId/pricing-profiles/:profileId/rules')
  @ApiOperation({ summary: 'Create a price rule' })
  createPricingRule(
    @Param('id') id: number,
    @Param('placeId') placeId: number,
    @Param('profileId') profileId: number,
    @Body() dto: CreatePricingRuleDto,
    @Req() req: any,
  ) {
    return this.facilities.createPricingRule(+id, +placeId, +profileId, dto, req.user);
  }

  @Put(':id/places/:placeId/pricing-profiles/:profileId/rules/:ruleId')
  @ApiOperation({ summary: 'Update a price rule' })
  updatePricingRule(
    @Param('id') id: number,
    @Param('placeId') placeId: number,
    @Param('profileId') profileId: number,
    @Param('ruleId') ruleId: number,
    @Body() dto: UpdatePricingRuleDto,
    @Req() req: any,
  ) {
    return this.facilities.updatePricingRule(+id, +placeId, +profileId, +ruleId, dto, req.user);
  }

  @Delete(':id/places/:placeId/pricing-profiles/:profileId/rules/:ruleId')
  @ApiOperation({ summary: 'Archive (soft-delete) a price rule' })
  deletePricingRule(
    @Param('id') id: number,
    @Param('placeId') placeId: number,
    @Param('profileId') profileId: number,
    @Param('ruleId') ruleId: number,
    @Req() req: any,
  ) {
    return this.facilities.deletePricingRule(+id, +placeId, +profileId, +ruleId, req.user);
  }

  // Staff
  @Get(':id/staff')
  listStaff(@Param('id') id: number, @Req() req: any) { return this.facilities.listStaff(+id, req.user); }

  @Post(':id/staff')
  addStaff(@Param('id') id: number, @Body() dto: AddStaffDto, @Req() req: any) {
    return this.facilities.addStaff(+id, dto, req.user);
  }

  @Delete(':id/staff/:userId/:roleId')
  removeStaff(@Param('id') id: number, @Param('userId') userId: number, @Param('roleId') roleId: number, @Req() req: any) {
    return this.facilities.removeStaff(+id, +userId, +roleId, req.user);
  }

}
