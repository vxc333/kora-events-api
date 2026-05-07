import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddTicketTransfers1747400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE ticket_transfer_status_enum AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED')`);
    await queryRunner.createTable(
      new Table({
        name: 'ticket_transfers',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'eventId', type: 'uuid' },
          { name: 'fromParticipantId', type: 'uuid' },
          { name: 'toParticipantId', type: 'uuid', isNullable: true },
          { name: 'toEmail', type: 'varchar' },
          { name: 'toName', type: 'varchar' },
          { name: 'toCpf', type: 'varchar', isNullable: true },
          { name: 'toPhone', type: 'varchar', isNullable: true },
          { name: 'token', type: 'uuid', isUnique: true },
          { name: 'status', type: 'ticket_transfer_status_enum', default: "'PENDING'" },
          { name: 'expiresAt', type: 'timestamptz' },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['eventId'], referencedTableName: 'events', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['fromParticipantId'], referencedTableName: 'participants', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['toParticipantId'], referencedTableName: 'participants', referencedColumnNames: ['id'], onDelete: 'SET NULL' },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ticket_transfers');
    await queryRunner.query(`DROP TYPE ticket_transfer_status_enum`);
  }
}
