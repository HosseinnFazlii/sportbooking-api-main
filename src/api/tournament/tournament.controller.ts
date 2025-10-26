import { Body, Controller, Get, Param, Post, Put, Query, Req, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base.controller';
import { Tournament } from '../../entities/tournament';
import { VTournament } from '../../entities/vTournament';
import { TournamentService } from './tournament.service';
import { TournamentRegisterDto } from './dto/register.dto';
import { SubmitScoreDto } from './dto/submit-score.dto';

@ApiTags('tournament')
@ApiBearerAuth()
@Controller('tournament')
export class TournamentController extends BaseController<Tournament, VTournament> {
  constructor(private readonly tournaments: TournamentService) {
    super(tournaments, 'tournament', {
      permissions: {
        list: ['tournament.read'],
        read: ['tournament.read'],
        create: ['tournament.create'],
        update: ['tournament.update'],
        delete: ['tournament.delete'],
      },
    });
  }

  @Get()
  override findAll(@Query() query: any, @Req() request: any) {
    return super.findAll(query, request);
  }

  @Get(':id')
  override findOne(@Param('id') id: number, @Req() request: any) {
    return super.findOne(id, request);
  }

  @Post(':id/register')
  @ApiOperation({ summary: 'Register current user for the tournament' })
  register(@Param('id') id: number, @Body() dto: TournamentRegisterDto, @Req() req: any) {
    return this.tournaments.register(id, req.user, !!dto?.holdOnly);
  }

  @Post(':id/generate-matches')
  @ApiOperation({ summary: 'Generate initial matches from current registrations' })
  generate(@Param('id') id: number) {
    return this.tournaments.generateMatches(id);
  }

  @Put('matches/:matchId/submit-score')
  @ApiOperation({ summary: 'Submit/Update match score and recompute standings' })
  submitScore(@Param('matchId') matchId: number, @Body() dto: SubmitScoreDto) {
    return this.tournaments.submitScore(matchId, dto.aScore, dto.bScore);
  }

  @Get(':id/standings')
  @ApiOperation({ summary: 'Get current standings' })
  standings(@Param('id') id: number) {
    return this.tournaments.standings(id);
  }

  // Images
  @Get(':id/images')
  listImages(@Param('id') id: number) {
    return this.tournaments.listImages(+id);
  }

  @Post(':id/images')
  addImage(@Param('id') id: number, @Body() dto: { url: string; sort?: number }) {
    return this.tournaments.addImage(+id, dto.url, dto.sort ?? 0);
  }

  @Delete(':id/images/:imageId')
  removeImage(@Param('id') id: number, @Param('imageId') imageId: number) {
    return this.tournaments.removeImage(+id, +imageId);
  }
}
