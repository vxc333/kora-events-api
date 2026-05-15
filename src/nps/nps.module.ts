import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/event.entity';
import { NpsResponse } from './nps-response.entity';
import { NpsController, PublicNpsController } from './nps.controller';
import { NpsService } from './nps.service';

@Module({
  imports: [TypeOrmModule.forFeature([NpsResponse, Event])],
  controllers: [NpsController, PublicNpsController],
  providers: [NpsService],
})
export class NpsModule {}
