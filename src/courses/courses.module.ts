import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesController, EventCoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { Course } from './course.entity';
import { CourseModule } from './course-module.entity';
import { QuizQuestion } from './quiz-question.entity';
import { CourseEnrollment } from './course-enrollment.entity';
import { ModuleCompletion } from './module-completion.entity';
import { Event } from '../events/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModule,
      QuizQuestion,
      CourseEnrollment,
      ModuleCompletion,
      Event,
    ]),
  ],
  controllers: [CoursesController, EventCoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
