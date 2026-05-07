import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';

export enum BroadcastSegment {
  ALL        = 'ALL',
  CONFIRMED  = 'CONFIRMED',
  NO_CHECKIN = 'NO_CHECKIN',
  PENDING    = 'PENDING',
}

export enum BroadcastStatus {
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  DONE    = 'DONE',
}

@Entity('broadcast_messages')
export class BroadcastMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  htmlBody: string;

  @Column({ type: 'enum', enum: BroadcastSegment })
  segment: BroadcastSegment;

  @Column({ type: 'enum', enum: BroadcastStatus, default: BroadcastStatus.PENDING })
  status: BroadcastStatus;

  @Column({ default: 0 })
  recipientCount: number;

  @Column({ default: 0 })
  sentCount: number;

  @Column({ default: 0 })
  failedCount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
