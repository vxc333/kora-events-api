import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddReminderSentToParticipants1746600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'participants',
      new TableColumn({ name: 'reminderSent24h', type: 'boolean', default: false }),
    );
    await queryRunner.addColumn(
      'participants',
      new TableColumn({ name: 'reminderSent1h', type: 'boolean', default: false }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('participants', 'reminderSent24h');
    await queryRunner.dropColumn('participants', 'reminderSent1h');
  }
}
