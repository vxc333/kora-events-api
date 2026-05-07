import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddNotifications1747200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE notification_type_enum AS ENUM (
        'CONFIRMATION', 'REMINDER_24H', 'REMINDER_1H', 'CERTIFICATE',
        'APPROVAL_APPROVED', 'APPROVAL_REJECTED', 'BROADCAST', 'CANCELLATION'
      )
    `);
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'participantId', type: 'uuid' },
          { name: 'eventId', type: 'uuid' },
          { name: 'type', type: 'notification_type_enum' },
          { name: 'title', type: 'varchar' },
          { name: 'body', type: 'text', isNullable: true },
          { name: 'readAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['participantId'], referencedTableName: 'participants', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['eventId'], referencedTableName: 'events', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
    await queryRunner.query(`DROP TYPE notification_type_enum`);
  }
}
