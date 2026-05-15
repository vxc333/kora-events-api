import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('course_enrollments')
export class CourseEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true })
  participantId: string | null;

  @Column({ type: 'uuid' })
  courseId: string;

  @Column({ default: false })
  certificateAvailable: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  enrolledAt: Date;
}
