import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { RegistrationField, FieldType } from './registration-field.entity';
import { ParticipantResponse } from './participant-response.entity';
import { Event } from '../events/event.entity';
import { CreateRegistrationFieldDto } from './dto/create-registration-field.dto';
import { UpdateRegistrationFieldDto } from './dto/update-registration-field.dto';

@Injectable()
export class RegistrationFieldsService {
  constructor(
    @InjectRepository(RegistrationField)
    private readonly fieldRepo: Repository<RegistrationField>,
    @InjectRepository(ParticipantResponse)
    private readonly responseRepo: Repository<ParticipantResponse>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async create(eventId: string, userId: string, dto: CreateRegistrationFieldDto): Promise<RegistrationField> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const requiresOptions = [FieldType.SELECT, FieldType.RADIO, FieldType.CHECKBOX].includes(dto.type);
    if (requiresOptions && (!dto.options || dto.options.length === 0)) {
      throw new BadRequestException(`Campo do tipo ${dto.type} requer ao menos uma opção`);
    }

    const field = this.fieldRepo.create({
      eventId,
      ticketId: dto.ticketId ?? null,
      label: dto.label,
      type: dto.type,
      options: requiresOptions ? (dto.options ?? null) : null,
      required: dto.required ?? false,
      order: dto.order ?? 0,
    });

    return this.fieldRepo.save(field);
  }

  async findByEvent(eventId: string, userId: string): Promise<RegistrationField[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    return this.fieldRepo.find({
      where: { eventId },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async findPublic(eventId: string, ticketId?: string): Promise<RegistrationField[]> {
    const where = ticketId
      ? [{ eventId, ticketId: IsNull() }, { eventId, ticketId }]
      : [{ eventId, ticketId: IsNull() }];

    return this.fieldRepo.find({ where, order: { order: 'ASC', createdAt: 'ASC' } });
  }

  async update(
    eventId: string, fieldId: string, userId: string, dto: UpdateRegistrationFieldDto,
  ): Promise<RegistrationField> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const field = await this.fieldRepo.findOne({ where: { id: fieldId, eventId } });
    if (!field) throw new NotFoundException('Campo não encontrado');

    const newType = dto.type ?? field.type;
    const requiresOptions = [FieldType.SELECT, FieldType.RADIO, FieldType.CHECKBOX].includes(newType);
    const newOptions = dto.options ?? field.options;
    if (requiresOptions && (!newOptions || newOptions.length === 0)) {
      throw new BadRequestException(`Campo do tipo ${newType} requer ao menos uma opção`);
    }

    Object.assign(field, {
      ...dto,
      options: requiresOptions ? newOptions : null,
    });

    return this.fieldRepo.save(field);
  }

  async remove(eventId: string, fieldId: string, userId: string): Promise<void> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const field = await this.fieldRepo.findOne({ where: { id: fieldId, eventId } });
    if (!field) throw new NotFoundException('Campo não encontrado');

    await this.fieldRepo.remove(field);
  }

  async validateResponses(
    eventId: string,
    ticketId: string | null,
    responses: Array<{ fieldId: string; value: string }>,
  ): Promise<void> {
    const fields = await this.findPublic(eventId, ticketId ?? undefined);
    const fieldMap = new Map(fields.map((f) => [f.id, f]));
    const responseMap = new Map(responses.map((r) => [r.fieldId, r.value]));

    for (const r of responses) {
      if (!fieldMap.has(r.fieldId)) {
        throw new BadRequestException(`Campo inválido: ${r.fieldId}`);
      }
    }

    for (const field of fields) {
      if (field.required) {
        const value = responseMap.get(field.id);
        if (!value || value.trim() === '') {
          throw new BadRequestException(`Campo obrigatório: ${field.label}`);
        }
      }
    }
  }

  async saveResponses(
    participantId: string,
    responses: Array<{ fieldId: string; value: string }>,
  ): Promise<void> {
    const entities = responses.map((r) =>
      this.responseRepo.create({ participantId, fieldId: r.fieldId, value: r.value }),
    );
    await this.responseRepo.save(entities);
  }

  async getResponsesByParticipantIds(
    participantIds: string[],
  ): Promise<Map<string, Map<string, string>>> {
    if (participantIds.length === 0) return new Map();

    const responses = await this.responseRepo.find({
      where: { participantId: In(participantIds) },
    });

    const map = new Map<string, Map<string, string>>();
    for (const r of responses) {
      if (!map.has(r.participantId)) map.set(r.participantId, new Map());
      map.get(r.participantId)!.set(r.fieldId, r.value);
    }
    return map;
  }
}
