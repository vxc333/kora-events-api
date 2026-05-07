import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum WebhookEventType {
  PARTICIPANT_REGISTERED = 'participant.registered',
  PARTICIPANT_CHECKED_IN = 'participant.checked_in',
  PARTICIPANT_APPROVED = 'participant.approved',
  PARTICIPANT_REJECTED = 'participant.rejected',
  PARTICIPANT_CANCELLED = 'participant.cancelled',
  CERTIFICATE_GENERATED = 'certificate.generated',
  TRANSFER_INITIATED = 'transfer.initiated',
  TRANSFER_COMPLETED = 'transfer.completed',
}

@Entity('webhook_endpoints')
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  url: string;

  @Column({ type: 'jsonb', default: [] })
  events: WebhookEventType[];

  @Column()
  secret: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
