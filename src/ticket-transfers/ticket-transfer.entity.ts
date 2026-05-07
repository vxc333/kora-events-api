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

export enum TicketTransferStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('ticket_transfers')
export class TicketTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  fromParticipantId: string;

  @ManyToOne(() => Participant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromParticipantId' })
  fromParticipant: Participant;

  @Column({ type: 'uuid', nullable: true })
  toParticipantId: string | null;

  @Column()
  toEmail: string;

  @Column()
  toName: string;

  @Column({ nullable: true, type: 'varchar' })
  toCpf: string | null;

  @Column({ nullable: true, type: 'varchar' })
  toPhone: string | null;

  @Column({ type: 'uuid', unique: true })
  token: string;

  @Column({ type: 'enum', enum: TicketTransferStatus, default: TicketTransferStatus.PENDING })
  status: TicketTransferStatus;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
