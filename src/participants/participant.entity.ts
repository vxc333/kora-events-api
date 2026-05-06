import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';
import { Ticket } from '../tickets/ticket.entity';

export enum ParticipantStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('participants')
@Index(['eventId', 'email'], { unique: true })
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ nullable: true, type: 'uuid' })
  ticketId: string | null;

  @ManyToOne(() => Ticket, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket | null;

  @Column({ nullable: true, type: 'uuid' })
  couponId: string | null;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true, type: 'varchar' })
  cpf: string | null;

  @Column({ nullable: true, type: 'varchar' })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING,
  })
  status: ParticipantStatus;

  @Column({ unique: true })
  qrToken: string;

  @Column({ type: 'timestamptz', nullable: true })
  checkedInAt: Date | null;

  @Column({ default: false })
  certificateReleased: boolean;

  @Column({ default: false })
  reminderSent24h: boolean;

  @Column({ default: false })
  reminderSent1h: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  registeredAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
