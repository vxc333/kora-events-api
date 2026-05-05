import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPageBuilderToEvents1746400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'events',
      new TableColumn({ name: 'pageBlocks', type: 'jsonb', isNullable: true }),
    );
    await queryRunner.addColumn(
      'events',
      new TableColumn({ name: 'pageSettings', type: 'jsonb', isNullable: true }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('events', 'pageSettings');
    await queryRunner.dropColumn('events', 'pageBlocks');
  }
}
