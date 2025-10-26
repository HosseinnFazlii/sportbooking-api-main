import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from '../../entities/tournament';
import { TournamentRegistration } from '../../entities/tournamentRegistration';
import { TournamentMatch } from '../../entities/tournamentMatch';
import { TournamentStanding } from '../../entities/tournamentStanding';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { VTournament } from '../../entities/vTournament';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, TournamentRegistration, TournamentMatch, TournamentStanding, VTournament])],
  providers: [TournamentService],
  controllers: [TournamentController],
  exports: [TournamentService],
})
export class TournamentModule {}
