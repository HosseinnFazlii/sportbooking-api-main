import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BaseService } from '../../common/base.service';
import { Tournament } from '../../entities/tournament';
import { TournamentRegistration } from '../../entities/tournamentRegistration';
import { TournamentMatch } from '../../entities/tournamentMatch';
import { TournamentStanding } from '../../entities/tournamentStanding';
import { VTournament } from '../../entities/vTournament';
import { IApiResponse } from '../../types/response';
import { TournamentImage } from '../../entities/tournamentImage';

@Injectable()
export class TournamentService extends BaseService<Tournament, VTournament> {
  constructor(
    @InjectRepository(Tournament) private readonly tRepo: Repository<Tournament>,
    @InjectRepository(TournamentRegistration) private readonly regRepo: Repository<TournamentRegistration>,
    @InjectRepository(TournamentMatch) private readonly matchRepo: Repository<TournamentMatch>,
    @InjectRepository(TournamentStanding) private readonly standingRepo: Repository<TournamentStanding>,
    @InjectRepository(VTournament) vTournamentRepo: Repository<VTournament>,
    dataSource: DataSource,
  ) {
    super(tRepo, dataSource, {
      searchableColumns: ['title', 'sportName', 'facilityName', 'typeCode', 'typeLabel'],
      defaultSort: '-createdAt',
      facilityScope: { enabled: true, facilityIdProperty: 'facilityId' }, // direct column
      list: { repo: vTournamentRepo, alias: 'vt' },
    });
  }

  /** Helper: get reg status id by code */
  private async regStatusId(code: 'pending' | 'awaiting_opponent' | 'confirmed'): Promise<number> {
    const row = await this['dataSource']
      .createQueryBuilder()
      .select('id')
      .from('tournament_reg_statuses', 's')
      .where('s.code = :c', { c: code })
      .getRawOne<{ id: number }>();
    if (!row) throw new BadRequestException(`Registration status ${code} missing`);
    return Number(row.id);
  }

  /** Register current user for a tournament */
  async register(tournamentId: number, userJwt: any, holdOnly = true): Promise<IApiResponse<boolean>> {
    const t = await this.tRepo.findOne({ where: { id: tournamentId } });
    if (!t || (t as any).deletedAt) throw new NotFoundException('Tournament not found');

    // basic timeframe checks
    if (new Date() > new Date(t.bookingDeadline)) {
      throw new BadRequestException('Booking deadline passed');
    }

    const statusId = await this.regStatusId(holdOnly ? 'pending' : 'confirmed');

    try {
      await this.regRepo.save(this.regRepo.create({
        tournamentId: tournamentId,
        userId: Number(userJwt.id),
        statusId,
      }));
    } catch {
      // unique(tournament_id, user_id)
      return { data: false, error: 'Already registered' };
    }

    return { data: true };
  }

  /** Generate matches from current registrations (calls DB function) */
  async generateMatches(tournamentId: number): Promise<IApiResponse<boolean>> {
    const t = await this.tRepo.findOne({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException('Tournament not found');

    await this['dataSource'].query('SELECT generate_initial_matches($1)', [tournamentId]); // :contentReference[oaicite:3]{index=3}
    return { data: true };
  }

  /** Submit / update a match score and recompute standings */
  async submitScore(matchId: number, aScore: number, bScore: number): Promise<IApiResponse<boolean>> {
    const m = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!m) throw new NotFoundException('Match not found');

    const winnerUserId =
      aScore === bScore ? null :
      (aScore > bScore ? m.aUserId : m.bUserId) ?? null;

    await this.matchRepo.update({ id: matchId }, {
      aScore, bScore,
      winnerUserId: winnerUserId ?? null,
      status: 'completed' as any,
    });

    await this['dataSource'].query('SELECT recompute_standings($1)', [m.tournamentId]); // :contentReference[oaicite:4]{index=4}
    return { data: true };
  }

  /** Get standings (join with users for display) */
  async standings(tournamentId: number) {
    return this['dataSource']
      .createQueryBuilder()
      .select([
        'ts.user_id AS "userId"',
        'u.name AS "userName"',
        'ts.points AS points',
        'ts.wins AS wins',
        'ts.draws AS draws',
        'ts.losses AS losses',
        'ts.score_for AS "scoreFor"',
        'ts.score_against AS "scoreAgainst"',
      ])
      .from('tournament_standings', 'ts')
      .innerJoin('users', 'u', 'u.id = ts.user_id')
      .where('ts.tournament_id = :tid', { tid: tournamentId })
      .orderBy('points', 'DESC')
      .addOrderBy('"scoreFor" - "scoreAgainst"', 'DESC')
      .getRawMany();
  }

  async listImages(tournamentId: number) {
    return this['dataSource'].getRepository(TournamentImage).find({
      where: { tournamentId } as any,
      order: { sortOrder: 'ASC' } as any,
    });
  }

  async addImage(tournamentId: number, url: string, sort = 0) {
    const repo = this['dataSource'].getRepository(TournamentImage);
    const img = await repo.save(repo.create({ tournamentId, url, sortOrder: sort }));
    return { data: img };
  }

  async removeImage(tournamentId: number, imageId: number) {
    const repo = this['dataSource'].getRepository(TournamentImage);
    const img = await repo.findOne({ where: { id: imageId, tournamentId } as any });
    if (!img) return { data: false, error: 'Image not found' };
    await repo.delete({ id: imageId } as any);
    return { data: true };
  }
}
