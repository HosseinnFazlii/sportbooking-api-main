import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class MetaService {
  constructor(private readonly ds: DataSource) {}

  bookingStatuses() {
    return this.ds.query('SELECT id, code, label FROM booking_statuses ORDER BY id');
  }
  tournamentTypes() {
    return this.ds.query('SELECT id, code, label FROM tournament_types ORDER BY id');
  }
  tournamentRegStatuses() {
    return this.ds.query('SELECT id, code, label FROM tournament_reg_statuses ORDER BY id');
  }
}
