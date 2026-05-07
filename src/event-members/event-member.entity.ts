import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Event } from '../events/event.entity';
import { User } from '../users/user.entity';

export enum EventMemberRole {
  ADMIN = 'ADMIN',
  CHECKIN = 'CHECKIN',
  FINANCEIRO = 'FINANCEIRO',
}

@Entity('event_members')
export class EventMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: EventMemberRole, default: EventMemberRole.ADMIN })
  role: EventMemberRole;

  @Column({ type: 'uuid', nullable: true })
  invitedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
