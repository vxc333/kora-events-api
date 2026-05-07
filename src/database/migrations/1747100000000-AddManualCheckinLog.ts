import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddManualCheckinLog1747100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE checkin_method_enum AS ENUM ('QR', 'CPF', 'NAME', 'MANUAL')`);
    await queryRunner.createTable(
      new Table({
        name: 'manual_checkin_logs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'eventId', type: 'uuid' },
          { name: 'participantId', type: 'uuid' },
          { name: 'operatorId', type: 'uuid', isNullable: true },
          { name: 'method', type: 'checkin_method_enum' },
          { name: 'reason', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['eventId'], referencedTableName: 'events', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['participantId'], referencedTableName: 'participants', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['operatorId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'SET NULL' },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('manual_checkin_logs');
    await queryRunner.query(`DROP TYPE checkin_method_enum`);
  }
}
