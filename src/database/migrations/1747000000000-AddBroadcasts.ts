import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddBroadcasts1747000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE broadcast_segment_enum AS ENUM ('ALL', 'CONFIRMED', 'NO_CHECKIN', 'PENDING')
    `);
    await queryRunner.query(`
      CREATE TYPE broadcast_status_enum AS ENUM ('PENDING', 'SENDING', 'DONE')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'broadcast_messages',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'eventId', type: 'uuid' },
          { name: 'subject', type: 'varchar' },
          { name: 'htmlBody', type: 'text' },
          { name: 'segment', type: 'broadcast_segment_enum' },
          { name: 'status', type: 'broadcast_status_enum', default: "'PENDING'" },
          { name: 'recipientCount', type: 'integer', default: 0 },
          { name: 'sentCount', type: 'integer', default: 0 },
          { name: 'failedCount', type: 'integer', default: 0 },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['eventId'], referencedTableName: 'events', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('broadcast_messages');
    await queryRunner.query(`DROP TYPE broadcast_status_enum`);
    await queryRunner.query(`DROP TYPE broadcast_segment_enum`);
  }
}
