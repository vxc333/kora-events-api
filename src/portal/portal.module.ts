import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { CertificatesModule } from '../certificates/certificates.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { Course } from '../courses/course.entity';
import { CourseEnrollment } from '../courses/course-enrollment.entity';
import { ModuleCompletion } from '../courses/module-completion.entity';
import { CourseModule as CourseModuleEntity } from '../courses/course-module.entity';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Participant,
      Event,
      Course,
      CourseEnrollment,
      ModuleCompletion,
      CourseModuleEntity,
    ]),
    CertificatesModule,
    CoursesModule,
  ],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
