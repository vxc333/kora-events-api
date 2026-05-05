import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum CertificateTemplate {
  DEFAULT = 'DEFAULT',
  LANDSCAPE = 'LANDSCAPE',
  MINIMALIST = 'MINIMALIST',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true, type: 'varchar' })
  bannerUrl: string | null;

  @Column({ nullable: true, type: 'varchar' })
  logoUrl: string | null;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column({ nullable: true, type: 'varchar' })
  location: string | null;

  @Column({ nullable: true, type: 'varchar' })
  onlineLink: string | null;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'numeric', default: 75 })
  minimumAttendancePercentage: number;

  @Column({ type: 'numeric', nullable: true })
  workloadHours: number | null;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: false })
  requiresApproval: boolean;

  @Column({ nullable: true, type: 'integer' })
  maxParticipants: number | null;

  @Column({ default: false })
  hasPaidTickets: boolean;

  @Column({ default: '#6366f1' })
  primaryColor: string;

  @Column({
    type: 'enum',
    enum: CertificateTemplate,
    default: CertificateTemplate.DEFAULT,
  })
  certificateTemplate: CertificateTemplate;

  @Column({ type: 'jsonb', nullable: true })
  pageBlocks: object[] | null;

  @Column({ type: 'jsonb', nullable: true })
  pageSettings: object | null;

  @Column({ type: 'uuid' })
  organizerId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizerId' })
  organizer: User;

  @OneToMany('Ticket', 'event')
  tickets: unknown[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
