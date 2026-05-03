import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

const mockBuffer = Buffer.from('%PDF-test');

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: jest.Mocked<ReportsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: {
            generateAttendancePdf: jest.fn().mockResolvedValue(mockBuffer),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get(ReportsService);
  });

  it('should call service with eventId and organizerId and send buffer', async () => {
    const res = {
      set: jest.fn(),
      send: jest.fn(),
    } as unknown as import('express').Response;

    await controller.getAttendancePdf('evt-uuid-1', 'org-uuid-1', res);

    expect(service.generateAttendancePdf).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1');
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.send).toHaveBeenCalledWith(mockBuffer);
  });
});
