import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPhoneToParticipants1746300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'participants',
      new TableColumn({ name: 'phone', type: 'varchar', isNullable: true }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('participants', 'phone');
  }
}
