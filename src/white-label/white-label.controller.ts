import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { WhiteLabelService } from './white-label.service';
import { UpdateWhiteLabelDto } from './dto/update-white-label.dto';

@ApiTags('White-label')
@Controller()
export class WhiteLabelController {
  constructor(private readonly whiteLabelService: WhiteLabelService) {}

  @Get('account/white-label')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter configuração white-label da conta' })
  getConfig(@CurrentUser() user: User) {
    return this.whiteLabelService.getConfig(user.id);
  }

  @Put('account/white-label')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Atualizar configuração white-label (requer plano Enterprise)' })
  updateConfig(@Body() dto: UpdateWhiteLabelDto, @CurrentUser() user: User) {
    return this.whiteLabelService.updateConfig(user.id, dto, user.plan);
  }

  @Get('public/white-label')
  @ApiOperation({ summary: 'Obter tema white-label por domínio customizado' })
  @ApiQuery({ name: 'domain', required: true, description: 'Domínio customizado' })
  getByDomain(@Query('domain') domain: string) {
    return this.whiteLabelService.getByDomain(domain);
  }
}
