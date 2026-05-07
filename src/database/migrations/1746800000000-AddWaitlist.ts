import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddWaitlist1746800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE waitlist_status_enum AS ENUM ('WAITING', 'NOTIFIED', 'CLAIMED', 'EXPIRED')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'waitlist_entries',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'eventId', type: 'uuid' },
          { name: 'ticketId', type: 'uuid' },
          { name: 'name', type: 'varchar' },
          { name: 'email', type: 'varchar' },
          { name: 'cpf', type: 'varchar', isNullable: true },
          { name: 'phone', type: 'varchar', isNullable: true },
          { name: 'status', type: 'waitlist_status_enum', default: "'WAITING'" },
          { name: 'claimToken', type: 'uuid', isNullable: true },
          { name: 'claimExpiresAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['eventId'], referencedTableName: 'events', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['ticketId'], referencedTableName: 'tickets', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'waitlist_entries',
      new TableIndex({ name: 'UQ_waitlist_ticket_email', columnNames: ['ticketId', 'email'], isUnique: true }),
    );

    await queryRunner.query(`ALTER TABLE tickets ADD COLUMN "waitlistEnabled" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE tickets ADD COLUMN "waitlistHoldsSpot" boolean NOT NULL DEFAULT false`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tickets DROP COLUMN "waitlistHoldsSpot"`);
    await queryRunner.query(`ALTER TABLE tickets DROP COLUMN "waitlistEnabled"`);
    await queryRunner.dropTable('waitlist_entries');
    await queryRunner.query(`DROP TYPE waitlist_status_enum`);
  }
}
