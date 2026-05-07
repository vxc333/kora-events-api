import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventMember, EventMemberRole } from './event-member.entity';
import { Event } from '../events/event.entity';
import { User } from '../users/user.entity';
import { CreateEventMemberDto } from './dto/create-event-member.dto';
import { UpdateEventMemberDto } from './dto/update-event-member.dto';

@Injectable()
export class EventMembersService {
  constructor(
    @InjectRepository(EventMember)
    private readonly memberRepo: Repository<EventMember>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async ensureOwner(eventId: string, userId: string): Promise<Event> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new ForbiddenException('Apenas o dono do evento pode gerenciar membros');
    return event;
  }

  async hasAccess(eventId: string, userId: string): Promise<boolean> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) return false;
    if (event.organizerId === userId) return true;
    const member = await this.memberRepo.findOne({ where: { eventId, userId } });
    return !!member;
  }

  async addMember(
    eventId: string,
    inviterId: string,
    dto: CreateEventMemberDto,
  ): Promise<EventMember> {
    await this.ensureOwner(eventId, inviterId);
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Usuário não encontrado com este email');
    if (user.id === inviterId) throw new ConflictException('Você já é o dono deste evento');
    const existing = await this.memberRepo.findOne({ where: { eventId, userId: user.id } });
    if (existing) throw new ConflictException('Usuário já é membro deste evento');
    return this.memberRepo.save(
      this.memberRepo.create({
        eventId,
        userId: user.id,
        role: dto.role ?? EventMemberRole.ADMIN,
        invitedById: inviterId,
      }),
    );
  }

  async findByEvent(eventId: string, requesterId: string): Promise<EventMember[]> {
    const canAccess = await this.hasAccess(eventId, requesterId);
    if (!canAccess) throw new ForbiddenException('Acesso negado');
    return this.memberRepo.find({
      where: { eventId },
      relations: ['user', 'invitedBy'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateRole(
    eventId: string,
    memberId: string,
    ownerId: string,
    dto: UpdateEventMemberDto,
  ): Promise<EventMember> {
    await this.ensureOwner(eventId, ownerId);
    const member = await this.memberRepo.findOne({ where: { id: memberId, eventId } });
    if (!member) throw new NotFoundException('Membro não encontrado');
    member.role = dto.role;
    return this.memberRepo.save(member);
  }

  async removeMember(eventId: string, memberId: string, ownerId: string): Promise<void> {
    await this.ensureOwner(eventId, ownerId);
    const member = await this.memberRepo.findOne({ where: { id: memberId, eventId } });
    if (!member) throw new NotFoundException('Membro não encontrado');
    await this.memberRepo.remove(member);
  }
}
