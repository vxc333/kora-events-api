import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddWhiteLabel1747700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'white_label_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'userId', type: 'uuid', isUnique: true },
          { name: 'customDomain', type: 'varchar', isNullable: true },
          { name: 'logoUrl', type: 'varchar', isNullable: true },
          { name: 'primaryColor', type: 'varchar', isNullable: true },
          { name: 'accentColor', type: 'varchar', isNullable: true },
          { name: 'hidePoweredBy', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_white_label_configs_customDomain',
            columnNames: ['customDomain'],
            isUnique: true,
            where: '"customDomain" IS NOT NULL',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('white_label_configs');
  }
}
