import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseModule } from './course-module.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizerId: string;

  @Column({ type: 'uuid', nullable: true })
  eventId: string | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ nullable: true, type: 'varchar' })
  coverUrl: string | null;

  @Column({ default: 0 })
  totalDuration: number;

  @Column({ type: 'integer', default: 80 })
  minimumCompletion: number;

  @Column({ default: false })
  isPublished: boolean;

  @OneToMany(() => CourseModule, (m) => m.course, { cascade: true })
  modules: CourseModule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
