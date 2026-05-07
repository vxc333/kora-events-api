import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddPushTokens1747900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'push_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid', isNullable: true },
          { name: 'qrToken', type: 'varchar', isNullable: true },
          {
            name: 'fcmToken',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'push_tokens',
      new TableIndex({
        name: 'IDX_push_tokens_qrToken',
        columnNames: ['qrToken'],
      }),
    );

    await queryRunner.createIndex(
      'push_tokens',
      new TableIndex({
        name: 'IDX_push_tokens_userId',
        columnNames: ['userId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('push_tokens');
  }
}
