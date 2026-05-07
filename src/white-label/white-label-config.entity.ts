import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('white_label_configs')
export class WhiteLabelConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn()
  user?: User;

  @Column({ nullable: true, type: 'varchar' })
  customDomain: string | null;

  @Column({ nullable: true, type: 'varchar' })
  logoUrl: string | null;

  @Column({ nullable: true, type: 'varchar' })
  primaryColor: string | null;

  @Column({ nullable: true, type: 'varchar' })
  accentColor: string | null;

  @Column({ default: false })
  hidePoweredBy: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
