import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RegistrationFieldsService } from './registration-fields.service';
import { RegistrationField, FieldType } from './registration-field.entity';
import { ParticipantResponse } from './participant-response.entity';
import { Event } from '../events/event.entity';

const mockEvent = { id: 'evt-uuid-1', organizerId: 'usr-uuid-1' } as Event;

const mockField: RegistrationField = {
  id: 'fld-uuid-1',
  eventId: 'evt-uuid-1',
  ticketId: null,
  event: mockEvent,
  ticket: null,
  label: 'Área de atuação',
  type: FieldType.SELECT,
  options: ['Tecnologia', 'Educação'],
  required: true,
  order: 0,
  createdAt: new Date(),
};

describe('RegistrationFieldsService', () => {
  let service: RegistrationFieldsService;
  let fieldRepo: jest.Mocked<Repository<RegistrationField>>;
  let responseRepo: jest.Mocked<Repository<ParticipantResponse>>;
  let eventRepo: jest.Mocked<Repository<Event>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationFieldsService,
        {
          provide: getRepositoryToken(RegistrationField),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ParticipantResponse),
          useValue: { find: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(RegistrationFieldsService);
    fieldRepo = module.get(getRepositoryToken(RegistrationField));
    responseRepo = module.get(getRepositoryToken(ParticipantResponse));
    eventRepo = module.get(getRepositoryToken(Event));
  });

  describe('create', () => {
    it('should throw NotFoundException when event not found', async () => {
      eventRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create('evt-uuid-1', 'usr-uuid-1', {
          label: 'X',
          type: FieldType.TEXT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when SELECT field has no options', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      await expect(
        service.create('evt-uuid-1', 'usr-uuid-1', {
          label: 'X',
          type: FieldType.SELECT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create TEXT field without options', async () => {
      const textField = { ...mockField, type: FieldType.TEXT, options: null };
      eventRepo.findOne.mockResolvedValue(mockEvent);
      fieldRepo.create.mockReturnValue(textField);
      fieldRepo.save.mockResolvedValue(textField);
      const result = await service.create('evt-uuid-1', 'usr-uuid-1', {
        label: 'Nome completo',
        type: FieldType.TEXT,
      });
      expect(result.options).toBeNull();
    });

    it('should create SELECT field with options', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      fieldRepo.create.mockReturnValue(mockField);
      fieldRepo.save.mockResolvedValue(mockField);
      const result = await service.create('evt-uuid-1', 'usr-uuid-1', {
        label: 'Área',
        type: FieldType.SELECT,
        options: ['Tecnologia', 'Educação'],
      });
      expect(result.options).toEqual(['Tecnologia', 'Educação']);
    });
  });

  describe('validateResponses', () => {
    it('should throw BadRequestException when fieldId does not belong to event', async () => {
      fieldRepo.find.mockResolvedValue([mockField]); // only fld-uuid-1 is valid
      await expect(
        service.validateResponses('evt-uuid-1', null, [
          { fieldId: 'unknown-uuid', value: 'x' },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when required field is missing', async () => {
      fieldRepo.find.mockResolvedValue([mockField]);
      await expect(
        service.validateResponses('evt-uuid-1', null, []),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass when all required fields have responses', async () => {
      fieldRepo.find.mockResolvedValue([mockField]);
      await expect(
        service.validateResponses('evt-uuid-1', null, [
          { fieldId: 'fld-uuid-1', value: 'Tecnologia' },
        ]),
      ).resolves.not.toThrow();
    });

    it('should pass when optional field has no response', async () => {
      fieldRepo.find.mockResolvedValue([{ ...mockField, required: false }]);
      await expect(
        service.validateResponses('evt-uuid-1', null, []),
      ).resolves.not.toThrow();
    });
  });

  describe('saveResponses', () => {
    it('should save one entity per response', async () => {
      const mockResponse = {
        id: 'resp-1',
        participantId: 'part-1',
        fieldId: 'fld-uuid-1',
        value: 'Tecnologia',
      } as ParticipantResponse;
      responseRepo.create.mockReturnValue(mockResponse);
      responseRepo.save.mockResolvedValue([mockResponse]);
      await service.saveResponses('part-1', [
        { fieldId: 'fld-uuid-1', value: 'Tecnologia' },
      ]);
      expect(responseRepo.save).toHaveBeenCalledWith([mockResponse]);
    });
  });
});
