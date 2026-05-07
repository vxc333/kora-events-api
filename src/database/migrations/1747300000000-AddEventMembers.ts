import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddEventMembers1747300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE event_member_role_enum AS ENUM ('ADMIN', 'CHECKIN', 'FINANCEIRO')`);
    await queryRunner.createTable(
      new Table({
        name: 'event_members',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'eventId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'role', type: 'event_member_role_enum', default: "'ADMIN'" },
          { name: 'invitedById', type: 'uuid', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['eventId'], referencedTableName: 'events', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['userId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['invitedById'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'SET NULL' },
        ],
        uniques: [{ columnNames: ['eventId', 'userId'] }],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('event_members');
    await queryRunner.query(`DROP TYPE event_member_role_enum`);
  }
}
