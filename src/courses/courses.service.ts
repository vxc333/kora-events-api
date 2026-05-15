import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './course.entity';
import { CourseModule } from './course-module.entity';
import { QuizQuestion } from './quiz-question.entity';
import { CourseEnrollment } from './course-enrollment.entity';
import { ModuleCompletion } from './module-completion.entity';
import { Event } from '../events/event.entity';

export interface CourseResponse {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  totalDuration: number;
  minimumCompletion: number;
  enrolledAt: string;
  certificateAvailable: boolean;
  modules: {
    id: string;
    title: string;
    videoUrl: string | null;
    duration: number;
    order: number;
    completedAt: string | null;
  }[];
}

export interface QuizResult {
  correct: number;
  total: number;
  passed: boolean;
}

export interface CourseSummary {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  minimumCompletion: number;
  isPublished: boolean;
  totalDuration: number;
  moduleCount: number;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,

    @InjectRepository(CourseModule)
    private readonly moduleRepo: Repository<CourseModule>,

    @InjectRepository(QuizQuestion)
    private readonly quizRepo: Repository<QuizQuestion>,

    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepo: Repository<CourseEnrollment>,

    @InjectRepository(ModuleCompletion)
    private readonly completionRepo: Repository<ModuleCompletion>,

    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async verifyEventOwnership(
    eventId: string,
    organizerId: string,
  ): Promise<Event> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You do not own this event');
    }
    return event;
  }

  private async verifyCourseOwnership(
    courseId: string,
    organizerId: string,
  ): Promise<Course> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId, organizerId },
    });
    if (!course)
      throw new NotFoundException(
        `Course ${courseId} not found or not owned by you`,
      );
    return course;
  }

  private async recalcTotalDuration(course: Course): Promise<void> {
    const modules = await this.moduleRepo.find({ where: { courseId: course.id } });
    course.totalDuration = modules.reduce((sum, m) => sum + (m.duration ?? 0), 0);
    await this.courseRepo.save(course);
  }

  // ── Existing participant methods (JWT) ────────────────────────────────────

  async getCourse(courseId: string, userId: string): Promise<CourseResponse> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['modules'],
      order: { modules: { order: 'ASC' } },
    });

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    let enrollment = await this.enrollmentRepo.findOne({
      where: { userId, courseId },
    });

    if (!enrollment) {
      enrollment = this.enrollmentRepo.create({ userId, courseId });
      enrollment = await this.enrollmentRepo.save(enrollment);
    }

    const moduleIds = course.modules.map((m) => m.id);
    const completions =
      moduleIds.length > 0
        ? await this.completionRepo
            .createQueryBuilder('mc')
            .where('mc.userId = :userId', { userId })
            .andWhere('mc.moduleId IN (:...moduleIds)', { moduleIds })
            .getMany()
        : [];

    const completionMap = new Map(completions.map((c) => [c.moduleId, c]));

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverUrl: course.coverUrl,
      totalDuration: course.totalDuration,
      minimumCompletion: course.minimumCompletion,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      certificateAvailable: enrollment.certificateAvailable,
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        videoUrl: m.videoUrl,
        duration: m.duration,
        order: m.order,
        completedAt: completionMap.get(m.id)?.completedAt.toISOString() ?? null,
      })),
    };
  }

  async completeModule(
    courseId: string,
    moduleId: string,
    userId: string,
  ): Promise<{ completedAt: string }> {
    const module = await this.moduleRepo.findOne({
      where: { id: moduleId, courseId },
    });

    if (!module) {
      throw new NotFoundException(
        `Module ${moduleId} not found in course ${courseId}`,
      );
    }

    const existing = await this.completionRepo.findOne({
      where: { userId, moduleId },
    });
    const completion = existing ?? this.completionRepo.create({ userId, moduleId });
    await this.completionRepo.save(completion);

    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['modules'],
    });

    if (course && course.modules.length > 0) {
      const allModuleIds = course.modules.map((m) => m.id);
      const completedCount = await this.completionRepo
        .createQueryBuilder('mc')
        .where('mc.userId = :userId', { userId })
        .andWhere('mc.moduleId IN (:...moduleIds)', { moduleIds: allModuleIds })
        .getCount();

      const completionRate = completedCount / course.modules.length;
      const certificateAvailable =
        completionRate >= course.minimumCompletion / 100;

      await this.enrollmentRepo.update(
        { userId, courseId },
        { certificateAvailable },
      );
    }

    const saved = await this.completionRepo.findOne({
      where: { userId, moduleId },
    });

    return { completedAt: saved!.completedAt.toISOString() };
  }

  async getModuleQuiz(
    courseId: string,
    moduleId: string,
    userId: string,
  ): Promise<QuizQuestion[]> {
    const module = await this.moduleRepo.findOne({
      where: { id: moduleId, courseId },
    });

    if (!module) {
      throw new NotFoundException(
        `Module ${moduleId} not found in course ${courseId}`,
      );
    }

    void userId;

    return this.quizRepo.find({
      where: { moduleId },
      order: { order: 'ASC' },
    });
  }

  async submitQuiz(
    courseId: string,
    moduleId: string,
    answers: number[],
    userId: string,
  ): Promise<QuizResult> {
    const module = await this.moduleRepo.findOne({
      where: { id: moduleId, courseId },
    });

    if (!module) {
      throw new NotFoundException(
        `Module ${moduleId} not found in course ${courseId}`,
      );
    }

    const questions = await this.quizRepo.find({
      where: { moduleId },
      order: { order: 'ASC' },
    });

    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i].correctIndex) {
        correct++;
      }
    }

    const passed = questions.length > 0 && correct / questions.length >= 0.7;

    if (passed) {
      const existing = await this.completionRepo.findOne({
        where: { userId, moduleId },
      });
      const completion =
        existing ?? this.completionRepo.create({ userId, moduleId });
      completion.passed = passed;
      await this.completionRepo.save(completion);
    }

    return { correct, total: questions.length, passed };
  }

  // ── Organizer management methods ──────────────────────────────────────────

  async getEventCourses(
    eventId: string,
    organizerId: string,
  ): Promise<CourseSummary[]> {
    await this.verifyEventOwnership(eventId, organizerId);

    const courses = await this.courseRepo.find({
      where: { eventId },
      relations: ['modules'],
      order: { createdAt: 'ASC' },
    });

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      coverUrl: c.coverUrl,
      minimumCompletion: c.minimumCompletion,
      isPublished: c.isPublished,
      totalDuration: c.totalDuration,
      moduleCount: c.modules?.length ?? 0,
    }));
  }

  async createCourse(
    eventId: string,
    organizerId: string,
    dto: {
      title: string;
      description?: string;
      coverUrl?: string;
      minimumCompletion?: number;
    },
  ): Promise<Course> {
    await this.verifyEventOwnership(eventId, organizerId);

    const course = this.courseRepo.create({
      organizerId,
      eventId,
      title: dto.title,
      description: dto.description ?? null,
      coverUrl: dto.coverUrl ?? null,
      minimumCompletion: dto.minimumCompletion ?? 80,
    });

    return this.courseRepo.save(course);
  }

  async updateCourse(
    courseId: string,
    organizerId: string,
    dto: {
      title?: string;
      description?: string;
      coverUrl?: string;
      minimumCompletion?: number;
      isPublished?: boolean;
    },
  ): Promise<Course> {
    const course = await this.verifyCourseOwnership(courseId, organizerId);
    Object.assign(course, dto);
    return this.courseRepo.save(course);
  }

  async deleteCourse(courseId: string, organizerId: string): Promise<void> {
    const course = await this.verifyCourseOwnership(courseId, organizerId);
    await this.courseRepo.remove(course);
  }

  async addModule(
    courseId: string,
    organizerId: string,
    dto: { title: string; videoUrl?: string; duration?: number },
  ): Promise<CourseModule> {
    const course = await this.verifyCourseOwnership(courseId, organizerId);

    const existing = await this.moduleRepo.find({ where: { courseId } });
    const maxOrder = existing.reduce((max, m) => Math.max(max, m.order), 0);

    const module = this.moduleRepo.create({
      courseId,
      title: dto.title,
      videoUrl: dto.videoUrl ?? null,
      duration: dto.duration ?? 0,
      order: maxOrder + 1,
    });

    const saved = await this.moduleRepo.save(module);
    await this.recalcTotalDuration(course);
    return saved;
  }

  async updateModule(
    courseId: string,
    moduleId: string,
    organizerId: string,
    dto: {
      title?: string;
      videoUrl?: string;
      duration?: number;
      order?: number;
    },
  ): Promise<CourseModule> {
    const course = await this.verifyCourseOwnership(courseId, organizerId);

    const module = await this.moduleRepo.findOne({
      where: { id: moduleId, courseId },
    });
    if (!module)
      throw new NotFoundException(
        `Module ${moduleId} not found in course ${courseId}`,
      );

    Object.assign(module, dto);
    const saved = await this.moduleRepo.save(module);
    await this.recalcTotalDuration(course);
    return saved;
  }

  async deleteModule(
    courseId: string,
    moduleId: string,
    organizerId: string,
  ): Promise<void> {
    const course = await this.verifyCourseOwnership(courseId, organizerId);

    const module = await this.moduleRepo.findOne({
      where: { id: moduleId, courseId },
    });
    if (!module)
      throw new NotFoundException(
        `Module ${moduleId} not found in course ${courseId}`,
      );

    await this.moduleRepo.remove(module);
    await this.recalcTotalDuration(course);
  }

  async addQuizQuestion(
    courseId: string,
    moduleId: string,
    organizerId: string,
    dto: { question: string; options: string[]; correctIndex: number },
  ): Promise<QuizQuestion> {
    await this.verifyCourseOwnership(courseId, organizerId);

    const module = await this.moduleRepo.findOne({
      where: { id: moduleId, courseId },
    });
    if (!module)
      throw new NotFoundException(
        `Module ${moduleId} not found in course ${courseId}`,
      );

    const existing = await this.quizRepo.find({ where: { moduleId } });
    const maxOrder = existing.reduce((max, q) => Math.max(max, q.order), 0);

    const question = this.quizRepo.create({
      moduleId,
      question: dto.question,
      options: dto.options,
      correctIndex: dto.correctIndex,
      order: maxOrder + 1,
    });

    const saved = await this.quizRepo.save(question);

    if (!module.hasQuiz) {
      module.hasQuiz = true;
      await this.moduleRepo.save(module);
    }

    return saved;
  }

  async deleteQuizQuestion(
    courseId: string,
    moduleId: string,
    questionId: string,
    organizerId: string,
  ): Promise<void> {
    await this.verifyCourseOwnership(courseId, organizerId);

    const question = await this.quizRepo.findOne({
      where: { id: questionId, moduleId },
    });
    if (!question)
      throw new NotFoundException(`Question ${questionId} not found`);

    await this.quizRepo.remove(question);

    const remaining = await this.quizRepo.count({ where: { moduleId } });
    if (remaining === 0) {
      await this.moduleRepo.update({ id: moduleId }, { hasQuiz: false });
    }
  }

  // ── Portal methods (participantId-based) ──────────────────────────────────

  async getPortalCourse(
    courseId: string,
    participantId: string,
  ): Promise<CourseResponse> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['modules'],
      order: { modules: { order: 'ASC' } },
    });

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    let enrollment = await this.enrollmentRepo.findOne({
      where: { participantId, courseId },
    });

    if (!enrollment) {
      enrollment = this.enrollmentRepo.create({
        participantId,
        userId: null,
        courseId,
      });
      enrollment = await this.enrollmentRepo.save(enrollment);
    }

    const moduleIds = course.modules.map((m) => m.id);
    const completions =
      moduleIds.length > 0
        ? await this.completionRepo
            .createQueryBuilder('mc')
            .where('mc.participantId = :participantId', { participantId })
            .andWhere('mc.moduleId IN (:...moduleIds)', { moduleIds })
            .getMany()
        : [];

    const completionMap = new Map(completions.map((c) => [c.moduleId, c]));

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverUrl: course.coverUrl,
      totalDuration: course.totalDuration,
      minimumCompletion: course.minimumCompletion,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      certificateAvailable: enrollment.certificateAvailable,
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        videoUrl: m.videoUrl,
        duration: m.duration,
        order: m.order,
        completedAt: completionMap.get(m.id)?.completedAt.toISOString() ?? null,
      })),
    };
  }

  async completePortalModule(
    courseId: string,
    moduleId: string,
    participantId: string,
  ): Promise<{ completedAt: string }> {
    const module = await this.moduleRepo.findOne({
      where: { id: moduleId, courseId },
    });

    if (!module) {
      throw new NotFoundException(
        `Module ${moduleId} not found in course ${courseId}`,
      );
    }

    const existing = await this.completionRepo.findOne({
      where: { participantId, moduleId },
    });
    const completion =
      existing ??
      this.completionRepo.create({ participantId, userId: null, moduleId });
    await this.completionRepo.save(completion);

    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['modules'],
    });

    if (course && course.modules.length > 0) {
      const allModuleIds = course.modules.map((m) => m.id);
      const completedCount = await this.completionRepo
        .createQueryBuilder('mc')
        .where('mc.participantId = :participantId', { participantId })
        .andWhere('mc.moduleId IN (:...moduleIds)', { moduleIds: allModuleIds })
        .getCount();

      const completionRate = completedCount / course.modules.length;
      const certificateAvailable =
        completionRate >= course.minimumCompletion / 100;

      await this.enrollmentRepo.update(
        { participantId, courseId },
        { certificateAvailable },
      );
    }

    const saved = await this.completionRepo.findOne({
      where: { participantId, moduleId },
    });

    return { completedAt: saved!.completedAt.toISOString() };
  }
}
