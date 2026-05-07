import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('push_tokens')
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, type: 'uuid' })
  userId: string | null;

  @Column({ nullable: true, type: 'varchar' })
  qrToken: string | null;

  @Column({ unique: true })
  fcmToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
