// src/entities/country.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { State } from './state';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'char', length: 2, unique: true })
  iso2: string;

  @Column({ type: 'text' })
  name: string;

  @OneToMany(() => State, (state) => state.country)
  states: State[];
}
