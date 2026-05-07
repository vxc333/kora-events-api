import {
  Column, CreateDateColumn, Entity, Index, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';
import { Ticket } from '../tickets/ticket.entity';

export enum WaitlistStatus {
  WAITING  = 'WAITING',
  NOTIFIED = 'NOTIFIED',
  CLAIMED  = 'CLAIMED',
  EXPIRED  = 'EXPIRED',
}

@Entity('waitlist_entries')
@Index(['ticketId', 'email'], { unique: true })
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true, type: 'varchar' })
  cpf: string | null;

  @Column({ nullable: true, type: 'varchar' })
  phone: string | null;

  @Column({ type: 'enum', enum: WaitlistStatus, default: WaitlistStatus.WAITING })
  status: WaitlistStatus;

  @Column({ nullable: true, type: 'uuid' })
  claimToken: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  claimExpiresAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
