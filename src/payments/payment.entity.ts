import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Participant } from '../participants/participant.entity';

export enum PaymentMethod {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  BOLETO = 'BOLETO',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  participantId: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ nullable: true, type: 'uuid' })
  ticketId: string | null;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true, type: 'varchar' })
  pagarmeOrderId: string | null;

  @Column({ nullable: true, type: 'varchar' })
  pagarmeChargeId: string | null;

  // PIX
  @Column({ nullable: true, type: 'text' })
  pixQrCode: string | null;

  @Column({ nullable: true, type: 'varchar' })
  pixQrCodeUrl: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  pixExpiresAt: Date | null;

  // Boleto
  @Column({ nullable: true, type: 'varchar' })
  boletoUrl: string | null;

  @Column({ nullable: true, type: 'varchar' })
  boletoBarcode: string | null;

  @Column({ nullable: true, type: 'timestamptz' })
  boletoExpiresAt: Date | null;

  // Relations
  @ManyToOne(() => Participant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
