// src/entities/state.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Unique } from 'typeorm';
import { Country } from './country';
import { City } from './city';

@Unique(['countryId', 'name'])
@Entity('states')
export class State {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'smallint', name: 'country_id' })
  countryId: number;

  @ManyToOne(() => Country, (c) => c.states, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @Column({ type: 'text', nullable: true })
  code?: string;

  @Column({ type: 'text' })
  name: string;

  @OneToMany(() => City, (city) => city.state)
  cities: City[];
}
