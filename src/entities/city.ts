// src/entities/city.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { State } from './state';

@Unique(['stateId', 'name'])
@Entity('cities')
export class City {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'state_id' })
  stateId: number;

  @ManyToOne(() => State, (s) => s.cities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'state_id' })
  state: State;

  @Column({ type: 'text' })
  name: string;
}
