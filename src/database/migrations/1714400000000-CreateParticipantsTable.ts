import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateParticipantsTable1714400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "participant_status_enum" AS ENUM('PENDING','CONFIRMED','CANCELLED')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'participants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'eventId', type: 'uuid' },
          { name: 'ticketId', type: 'uuid', isNullable: true },
          { name: 'couponId', type: 'uuid', isNullable: true },
          { name: 'name', type: 'varchar' },
          { name: 'email', type: 'varchar' },
          { name: 'cpf', type: 'varchar', isNullable: true },
          {
            name: 'status',
            type: 'participant_status_enum',
            default: "'PENDING'",
          },
          { name: 'registeredAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'participants',
      new TableIndex({
        name: 'IDX_participants_eventId_email',
        columnNames: ['eventId', 'email'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'participants',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'participants',
      new TableForeignKey({
        columnNames: ['ticketId'],
        referencedTableName: 'tickets',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('participants');
    await queryRunner.query(`DROP TYPE "participant_status_enum"`);
  }
}
