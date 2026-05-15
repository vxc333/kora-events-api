import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { BroadcastMessage, BroadcastStatus } from '../broadcasts/broadcast-message.entity';

export interface EngagementMetrics {
  eventId: string;
  eventTitle: string;
  certificateDownloads: number;
  emailOpenRate: number;
  returnParticipants: number;
  checkinRate: number;
  npsAverage: number | null;
}

export interface EngagementSummary {
  totalCertificateDownloads: number;
  averageEmailOpenRate: number;
  averageCheckinRate: number;
  averageNps: number | null;
  events: EngagementMetrics[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(BroadcastMessage)
    private readonly broadcastRepo: Repository<BroadcastMessage>,
  ) {}

  async getEngagement(organizerId: string): Promise<EngagementSummary> {
    const events = await this.eventRepo.find({ where: { organizerId } });

    if (events.length === 0) {
      return {
        totalCertificateDownloads: 0,
        averageEmailOpenRate: 0,
        averageCheckinRate: 0,
        averageNps: null,
        events: [],
      };
    }

    const eventIds = events.map((e) => e.id);

    // Load all participants for all events by this organizer in one query
    const allParticipants = await this.participantRepo
      .createQueryBuilder('p')
      .where('p.eventId IN (:...eventIds)', { eventIds })
      .getMany();

    // Load all broadcasts for all events by this organizer in one query
    const allBroadcasts = await this.broadcastRepo
      .createQueryBuilder('b')
      .where('b.eventId IN (:...eventIds)', { eventIds })
      .getMany();

    // Group by eventId
    const participantsByEvent = new Map<string, Participant[]>();
    const broadcastsByEvent = new Map<string, BroadcastMessage[]>();

    for (const p of allParticipants) {
      const list = participantsByEvent.get(p.eventId) ?? [];
      list.push(p);
      participantsByEvent.set(p.eventId, list);
    }

    for (const b of allBroadcasts) {
      const list = broadcastsByEvent.get(b.eventId) ?? [];
      list.push(b);
      broadcastsByEvent.set(b.eventId, list);
    }

    // Build a set of (email -> Set<eventId>) for all participants across organizer's events
    // to determine return participants
    const emailToEventIds = new Map<string, Set<string>>();
    for (const p of allParticipants) {
      const set = emailToEventIds.get(p.email) ?? new Set<string>();
      set.add(p.eventId);
      emailToEventIds.set(p.email, set);
    }

    const eventMetrics: EngagementMetrics[] = events.map((event) => {
      const participants = participantsByEvent.get(event.id) ?? [];
      const broadcasts = broadcastsByEvent.get(event.id) ?? [];

      // certificateDownloads: participants with checkedInAt != null (finished event context)
      const certificateDownloads = participants.filter((p) => p.checkedInAt !== null).length;

      // emailOpenRate: average sentCount/recipientCount*100 across DONE broadcasts
      const doneBroadcasts = broadcasts.filter((b) => b.status === BroadcastStatus.DONE);
      let emailOpenRate = 0;
      if (doneBroadcasts.length > 0) {
        const rates = doneBroadcasts.map((b) =>
          b.recipientCount > 0 ? (b.sentCount / b.recipientCount) * 100 : 0,
        );
        emailOpenRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
      }

      // returnParticipants: count of participants in this event whose email also appears in another event by same organizer
      const returnParticipants = participants.filter((p) => {
        const eventSet = emailToEventIds.get(p.email);
        return eventSet !== undefined && eventSet.size > 1;
      }).length;

      // checkinRate: (checkedIn / total confirmed) * 100
      const confirmed = participants.filter((p) => p.status === ParticipantStatus.CONFIRMED);
      const checkedIn = confirmed.filter((p) => p.checkedInAt !== null).length;
      const checkinRate = confirmed.length > 0 ? (checkedIn / confirmed.length) * 100 : 0;

      return {
        eventId: event.id,
        eventTitle: event.title,
        certificateDownloads,
        emailOpenRate,
        returnParticipants,
        checkinRate,
        npsAverage: null,
      };
    });

    const totalCertificateDownloads = eventMetrics.reduce(
      (sum, m) => sum + m.certificateDownloads,
      0,
    );
    const averageEmailOpenRate =
      eventMetrics.reduce((sum, m) => sum + m.emailOpenRate, 0) / eventMetrics.length;
    const averageCheckinRate =
      eventMetrics.reduce((sum, m) => sum + m.checkinRate, 0) / eventMetrics.length;

    return {
      totalCertificateDownloads,
      averageEmailOpenRate,
      averageCheckinRate,
      averageNps: null,
      events: eventMetrics,
    };
  }
}
