import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';
import { Ticket } from '../tickets/ticket.entity';

export enum FieldType {
  TEXT     = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SELECT   = 'SELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO    = 'RADIO',
  DATE     = 'DATE',
}

@Entity('registration_fields')
export class RegistrationField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ nullable: true, type: 'uuid' })
  ticketId: string | null;

  @ManyToOne(() => Ticket, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket | null;

  @Column()
  label: string;

  @Column({ type: 'enum', enum: FieldType })
  type: FieldType;

  @Column({ type: 'jsonb', nullable: true })
  options: string[] | null;

  @Column({ default: false })
  required: boolean;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
