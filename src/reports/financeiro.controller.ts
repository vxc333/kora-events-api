import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Resumo financeiro: receita bruta, taxa e repasse por evento' })
  getSummary(@CurrentUser('id') organizerId: string) {
    return this.reportsService.getFinancialSummary(organizerId);
  }
}
