import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddRegistrationFields1746900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE registration_field_type_enum AS ENUM
        ('TEXT', 'TEXTAREA', 'SELECT', 'CHECKBOX', 'RADIO', 'DATE')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'registration_fields',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'eventId', type: 'uuid' },
          { name: 'ticketId', type: 'uuid', isNullable: true },
          { name: 'label', type: 'varchar' },
          { name: 'type', type: 'registration_field_type_enum' },
          { name: 'options', type: 'jsonb', isNullable: true },
          { name: 'required', type: 'boolean', default: false },
          { name: 'order', type: 'integer', default: 0 },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['eventId'], referencedTableName: 'events', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['ticketId'], referencedTableName: 'tickets', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'participant_responses',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'participantId', type: 'uuid' },
          { name: 'fieldId', type: 'uuid' },
          { name: 'value', type: 'text' },
        ],
        foreignKeys: [
          { columnNames: ['participantId'], referencedTableName: 'participants', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
          { columnNames: ['fieldId'], referencedTableName: 'registration_fields', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
        ],
      }),
    );

    await queryRunner.createIndex(
      'participant_responses',
      new TableIndex({ name: 'UQ_response_participant_field', columnNames: ['participantId', 'fieldId'], isUnique: true }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('participant_responses');
    await queryRunner.dropTable('registration_fields');
    await queryRunner.query(`DROP TYPE registration_field_type_enum`);
  }
}
