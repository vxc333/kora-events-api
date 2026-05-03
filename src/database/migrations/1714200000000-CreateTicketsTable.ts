import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTicketsTable1714200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tickets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar' },
          { name: 'description', type: 'varchar', isNullable: true },
          { name: 'price', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'currency', type: 'varchar', default: "'BRL'" },
          { name: 'quantity', type: 'integer', isNullable: true },
          { name: 'quantitySold', type: 'integer', default: 0 },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'salesStartDate', type: 'timestamptz', isNullable: true },
          { name: 'salesEndDate', type: 'timestamptz', isNullable: true },
          { name: 'isHalfPrice', type: 'boolean', default: false },
          { name: 'discountCode', type: 'varchar', isNullable: true },
          { name: 'discountPercentage', type: 'numeric', isNullable: true },
          { name: 'eventId', type: 'uuid' },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'tickets',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tickets');
  }
}
