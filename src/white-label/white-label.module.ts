import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteLabelConfig } from './white-label-config.entity';
import { WhiteLabelService } from './white-label.service';
import { WhiteLabelController } from './white-label.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WhiteLabelConfig])],
  controllers: [WhiteLabelController],
  providers: [WhiteLabelService],
  exports: [WhiteLabelService],
})
export class WhiteLabelModule {}
