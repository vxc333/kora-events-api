import {
  Column, Entity, Index, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Participant } from '../participants/participant.entity';
import { RegistrationField } from './registration-field.entity';

@Entity('participant_responses')
@Index(['participantId', 'fieldId'], { unique: true })
export class ParticipantResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  participantId: string;

  @ManyToOne(() => Participant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  @Column({ type: 'uuid' })
  fieldId: string;

  @ManyToOne(() => RegistrationField, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fieldId' })
  field: RegistrationField;

  @Column({ type: 'text' })
  value: string;
}
