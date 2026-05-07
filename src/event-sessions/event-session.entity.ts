import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';

@Entity('event_sessions')
export class EventSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  title: string;

  @Column({ type: 'date' })
  sessionDate: string;

  @Column()
  sessionTime: string;

  @Column({ nullable: true, type: 'varchar' })
  location: string | null;

  @Column({ nullable: true, type: 'integer' })
  maxParticipants: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
