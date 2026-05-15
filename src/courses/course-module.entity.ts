import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Course } from './course.entity';

@Entity('course_modules')
export class CourseModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, (c) => c.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'varchar' })
  videoUrl: string | null;

  @Column({ default: 0 })
  duration: number;

  @Column({ type: 'integer' })
  order: number;

  @Column({ default: false })
  hasQuiz: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
