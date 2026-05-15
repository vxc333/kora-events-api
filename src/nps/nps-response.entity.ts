import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('nps_responses')
export class NpsResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  participantId: string | null;

  @Column({ type: 'integer' })
  score: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ unique: true })
  respondentToken: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
