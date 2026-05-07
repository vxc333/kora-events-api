import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayments1747800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE payment_method_enum AS ENUM('PIX', 'CREDIT_CARD', 'BOLETO')`);
    await queryRunner.query(`CREATE TYPE payment_status_enum AS ENUM('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'CANCELLED')`);
    await queryRunner.query(`
      CREATE TABLE payments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "participantId" uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        "eventId" uuid NOT NULL,
        "ticketId" uuid,
        amount integer NOT NULL,
        method payment_method_enum NOT NULL,
        status payment_status_enum NOT NULL DEFAULT 'PENDING',
        "pagarmeOrderId" varchar,
        "pagarmeChargeId" varchar,
        "pixQrCode" text,
        "pixQrCodeUrl" varchar,
        "pixExpiresAt" timestamptz,
        "boletoUrl" varchar,
        "boletoBarcode" varchar,
        "boletoExpiresAt" timestamptz,
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE payments`);
    await queryRunner.query(`DROP TYPE payment_status_enum`);
    await queryRunner.query(`DROP TYPE payment_method_enum`);
  }
}
