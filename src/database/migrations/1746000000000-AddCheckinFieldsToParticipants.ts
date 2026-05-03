import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddCheckinFieldsToParticipants1746000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'participants',
      new TableColumn({ name: 'qrToken', type: 'varchar', isNullable: true }),
    );

    await queryRunner.query(`UPDATE participants SET "qrToken" = uuid_generate_v4()`);

    await queryRunner.changeColumn(
      'participants',
      'qrToken',
      new TableColumn({ name: 'qrToken', type: 'varchar', isNullable: false }),
    );

    await queryRunner.createIndex(
      'participants',
      new TableIndex({ name: 'IDX_participants_qrToken', columnNames: ['qrToken'], isUnique: true }),
    );

    await queryRunner.addColumn(
      'participants',
      new TableColumn({ name: 'checkedInAt', type: 'timestamptz', isNullable: true }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('participants', 'IDX_participants_qrToken');
    await queryRunner.dropColumn('participants', 'checkedInAt');
    await queryRunner.dropColumn('participants', 'qrToken');
  }
}
