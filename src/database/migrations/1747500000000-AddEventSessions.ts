import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddEventSessions1747500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'event_sessions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'eventId', type: 'uuid' },
          { name: 'title', type: 'varchar' },
          { name: 'sessionDate', type: 'date' },
          { name: 'sessionTime', type: 'varchar' },
          { name: 'location', type: 'varchar', isNullable: true },
          { name: 'maxParticipants', type: 'integer', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['eventId'], referencedTableName: 'events', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'session_checkins',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'sessionId', type: 'uuid' },
          { name: 'participantId', type: 'uuid' },
          { name: 'eventId', type: 'uuid' },
          { name: 'operatorId', type: 'uuid', isNullable: true },
          { name: 'method', type: 'checkin_method_enum' },
          { name: 'checkedInAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['sessionId'], referencedTableName: 'event_sessions', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['participantId'], referencedTableName: 'participants', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['eventId'], referencedTableName: 'events', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['operatorId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'SET NULL' },
        ],
        uniques: [{ columnNames: ['sessionId', 'participantId'] }],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('session_checkins');
    await queryRunner.dropTable('event_sessions');
  }
}
