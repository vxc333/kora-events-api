import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { User } from '../users/user.entity';

export enum CheckinMethod {
  QR = 'QR',
  CPF = 'CPF',
  NAME = 'NAME',
  MANUAL = 'MANUAL',
}

@Entity('manual_checkin_logs')
export class ManualCheckinLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  participantId: string;

  @ManyToOne(() => Participant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  @Column({ type: 'uuid', nullable: true })
  operatorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operatorId' })
  operator: User | null;

  @Column({ type: 'enum', enum: CheckinMethod })
  method: CheckinMethod;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
