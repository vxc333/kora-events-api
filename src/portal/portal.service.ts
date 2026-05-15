import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { Participant } from '../participants/participant.entity';
import { ParticipantStatus } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { CertificatesService } from '../certificates/certificates.service';
import { Course } from '../courses/course.entity';
import { CourseEnrollment } from '../courses/course-enrollment.entity';
import { CoursesService, CourseResponse } from '../courses/courses.service';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepo: Repository<CourseEnrollment>,
    private readonly certificatesService: CertificatesService,
    private readonly coursesService: CoursesService,
  ) {}

  private async resolveParticipant(qrToken: string): Promise<Participant> {
    const participant = await this.participantRepo.findOne({ where: { qrToken } });
    if (!participant) throw new NotFoundException('Token inválido');
    return participant;
  }

  async login(cpf: string, email: string): Promise<{ qrToken: string; participantName: string; participantEmail: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCpf = cpf?.trim() ?? '';

    const candidates = await this.participantRepo.find({
      where: [
        ...(normalizedCpf ? [{ email: ILike(normalizedEmail), cpf: normalizedCpf }] : []),
        { email: ILike(normalizedEmail), cpf: IsNull() },
      ],
      order: { registeredAt: 'DESC' },
      take: 1,
    });

    if (!candidates.length) {
      throw new NotFoundException('Nenhuma inscrição encontrada para este CPF e e-mail');
    }

    const p = candidates[0];
    return { qrToken: p.qrToken, participantName: p.name, participantEmail: p.email };
  }

  async getEvents(qrToken: string) {
    const ref = await this.participantRepo.findOne({ where: { qrToken } });
    if (!ref) throw new NotFoundException('Token inválido');

    const participants = await this.participantRepo.find({
      where: { email: ILike(ref.email) },
      relations: ['event', 'ticket'],
      order: { registeredAt: 'DESC' },
    });

    const now = new Date();
    return participants.map((p) => {
      const event = p.event as Event;
      const certificateAvailable =
        p.certificateReleased === true ||
        (!!p.checkedInAt && event.endDate < now);
      return {
        eventId: p.eventId,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventSlug: event.slug,
        status: p.status as ParticipantStatus,
        checkedInAt: p.checkedInAt,
        certificateAvailable,
        ticketName: (p.ticket as { name?: string } | null)?.name ?? null,
      };
    });
  }

  async downloadCertificate(qrToken: string, eventId: string): Promise<{ pdf: Buffer; slug: string }> {
    const ref = await this.participantRepo.findOne({ where: { qrToken } });
    if (!ref) throw new NotFoundException('Token inválido');

    const target = await this.participantRepo.findOne({
      where: { email: ILike(ref.email), eventId },
    });
    if (!target) throw new NotFoundException('Inscrição não encontrada');

    return this.certificatesService.generate(target.qrToken);
  }

  // ── Portal course methods ─────────────────────────────────────────────────

  async getPortalCourses(qrToken: string): Promise<
    {
      id: string;
      title: string;
      description: string | null;
      coverUrl: string | null;
      totalDuration: number;
      minimumCompletion: number;
      isPublished: boolean;
      eventId: string | null;
      enrolled: boolean;
      certificateAvailable: boolean;
    }[]
  > {
    const participant = await this.resolveParticipant(qrToken);

    // Find all event registrations for this participant (confirmed or checked-in)
    const participations = await this.participantRepo.find({
      where: { email: ILike(participant.email) },
    });

    const eventIds = participations.map((p) => p.eventId);

    if (eventIds.length === 0) return [];

    // Find courses linked to these events
    const courses = await this.courseRepo
      .createQueryBuilder('c')
      .where('c.eventId IN (:...eventIds)', { eventIds })
      .andWhere('c.isPublished = true')
      .getMany();

    if (courses.length === 0) return [];

    const courseIds = courses.map((c) => c.id);

    // Get existing enrollments for this participant
    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('e')
      .where('e.participantId = :pid', { pid: participant.id })
      .andWhere('e.courseId IN (:...courseIds)', { courseIds })
      .getMany();

    const enrollmentMap = new Map(
      enrollments.map((e) => [e.courseId, e]),
    );

    return courses.map((c) => {
      const enrollment = enrollmentMap.get(c.id);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        coverUrl: c.coverUrl,
        totalDuration: c.totalDuration,
        minimumCompletion: c.minimumCompletion,
        isPublished: c.isPublished,
        eventId: c.eventId,
        enrolled: !!enrollment,
        certificateAvailable: enrollment?.certificateAvailable ?? false,
      };
    });
  }

  async getPortalCourse(
    qrToken: string,
    courseId: string,
  ): Promise<CourseResponse> {
    const participant = await this.resolveParticipant(qrToken);
    return this.coursesService.getPortalCourse(courseId, participant.id);
  }

  async completePortalModule(
    qrToken: string,
    courseId: string,
    moduleId: string,
  ): Promise<{ completedAt: string }> {
    const participant = await this.resolveParticipant(qrToken);
    return this.coursesService.completePortalModule(courseId, moduleId, participant.id);
  }
}
