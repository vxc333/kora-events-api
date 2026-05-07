import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhiteLabelConfig } from './white-label-config.entity';
import { UpdateWhiteLabelDto } from './dto/update-white-label.dto';
import { UserPlan } from '../users/user.entity';

@Injectable()
export class WhiteLabelService {
  constructor(
    @InjectRepository(WhiteLabelConfig)
    private readonly configRepo: Repository<WhiteLabelConfig>,
  ) {}

  async getConfig(userId: string): Promise<WhiteLabelConfig> {
    const existing = await this.configRepo.findOne({ where: { userId } });
    if (existing) return existing;

    const created = this.configRepo.create({ userId });
    return this.configRepo.save(created);
  }

  async updateConfig(
    userId: string,
    dto: UpdateWhiteLabelDto,
    userPlan: UserPlan,
  ): Promise<WhiteLabelConfig> {
    if (userPlan !== UserPlan.ENTERPRISE) {
      throw new ForbiddenException({
        message: 'White-label requer plano Enterprise. Faça upgrade para continuar.',
        code: 'PLAN_UPGRADE_REQUIRED',
      });
    }

    const config = await this.getConfig(userId);
    Object.assign(config, dto);
    return this.configRepo.save(config);
  }

  async getByDomain(domain: string): Promise<WhiteLabelConfig> {
    const config = await this.configRepo.findOne({ where: { customDomain: domain } });
    if (!config) throw new NotFoundException('Domínio não encontrado');
    return config;
  }
}
