// src/entities/authOtp.ts
import { Entity, PrimaryGeneratedColumn, Column, Check } from 'typeorm';

@Check(`"purpose" IN ('login','register','reset')`)
@Entity('auth_otp')
export class AuthOtp {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'mobile' })
  mobile: number;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text' })
  purpose: 'login' | 'register' | 'reset';

  @Column({ type: 'timestamptz', name: 'issued_at', default: () => 'now()' })
  issuedAt: Date;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
  consumedAt?: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'int', name: 'max_attempts', default: 5 })
  maxAttempts: number;

  @Column({ type: 'inet', name: 'request_ip', nullable: true })
  requestIp?: string;
}
