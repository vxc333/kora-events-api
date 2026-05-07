import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';

export enum TicketType {
  STANDARD   = 'STANDARD',
  EARLY_BIRD = 'EARLY_BIRD',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'varchar' })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ default: 'BRL' })
  currency: string;

  @Column({ nullable: true, type: 'integer' })
  quantity: number | null;

  @Column({ default: 0 })
  quantitySold: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  salesStartDate: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  salesEndDate: Date | null;

  @Column({ default: false })
  isHalfPrice: boolean;

  @Column({
    type: 'enum',
    enum: TicketType,
    default: TicketType.STANDARD,
  })
  ticketType: TicketType;

  @Column({ default: false })
  feePassthrough: boolean;

  @Column({ default: false })
  waitlistEnabled: boolean;

  @Column({ default: false })
  waitlistHoldsSpot: boolean;

  @Column({ nullable: true, type: 'varchar' })
  discountCode: string | null;

  @Column({ nullable: true, type: 'numeric' })
  discountPercentage: number | null;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
