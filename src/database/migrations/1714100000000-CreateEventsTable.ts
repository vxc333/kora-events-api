import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateEventsTable1714100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "event_status_enum" AS ENUM('DRAFT','PUBLISHED','ONGOING','FINISHED','CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "certificate_template_enum" AS ENUM('DEFAULT','LANDSCAPE','MINIMALIST')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'slug', type: 'varchar', isUnique: true },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text' },
          { name: 'bannerUrl', type: 'varchar', isNullable: true },
          { name: 'logoUrl', type: 'varchar', isNullable: true },
          { name: 'startDate', type: 'timestamptz' },
          { name: 'endDate', type: 'timestamptz' },
          { name: 'startTime', type: 'varchar' },
          { name: 'endTime', type: 'varchar' },
          { name: 'location', type: 'varchar', isNullable: true },
          { name: 'onlineLink', type: 'varchar', isNullable: true },
          { name: 'isOnline', type: 'boolean', default: false },
          { name: 'minimumAttendancePercentage', type: 'numeric', default: 75 },
          { name: 'workloadHours', type: 'numeric' },
          {
            name: 'status',
            type: 'event_status_enum',
            default: "'DRAFT'",
          },
          { name: 'isPublic', type: 'boolean', default: true },
          { name: 'requiresApproval', type: 'boolean', default: false },
          { name: 'maxParticipants', type: 'integer', isNullable: true },
          { name: 'hasPaidTickets', type: 'boolean', default: false },
          { name: 'primaryColor', type: 'varchar', default: "'#6366f1'" },
          {
            name: 'certificateTemplate',
            type: 'certificate_template_enum',
            default: "'DEFAULT'",
          },
          { name: 'organizerId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'events',
      new TableForeignKey({
        columnNames: ['organizerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('events');
    await queryRunner.query(`DROP TYPE "certificate_template_enum"`);
    await queryRunner.query(`DROP TYPE "event_status_enum"`);
  }
}
