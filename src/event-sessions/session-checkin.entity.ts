import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventSession } from './event-session.entity';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { User } from '../users/user.entity';
import { CheckinMethod } from '../checkin/manual-checkin-log.entity';

@Entity('session_checkins')
export class SessionCheckin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => EventSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: EventSession;

  @Column({ type: 'uuid' })
  participantId: string;

  @ManyToOne(() => Participant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid', nullable: true })
  operatorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operatorId' })
  operator: User | null;

  @Column({ type: 'enum', enum: CheckinMethod })
  method: CheckinMethod;

  @CreateDateColumn({ type: 'timestamptz' })
  checkedInAt: Date;
}
