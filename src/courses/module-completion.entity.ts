import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('module_completions')
export class ModuleCompletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true })
  participantId: string | null;

  @Column({ type: 'uuid' })
  moduleId: string;

  @Column({ default: false })
  passed: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  completedAt: Date;
}
