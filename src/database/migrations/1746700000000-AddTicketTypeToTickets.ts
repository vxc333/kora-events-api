import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketTypeToTickets1746700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE ticket_type_enum AS ENUM ('STANDARD', 'EARLY_BIRD')
    `);
    await queryRunner.query(`
      ALTER TABLE tickets
      ADD COLUMN "ticketType" ticket_type_enum NOT NULL DEFAULT 'STANDARD'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tickets DROP COLUMN "ticketType"`);
    await queryRunner.query(`DROP TYPE ticket_type_enum`);
  }
}
