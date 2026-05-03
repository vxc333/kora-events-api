import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCouponsTable1714500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "discount_type_enum" AS ENUM('PERCENTAGE','FIXED')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'coupons',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'eventId', type: 'uuid' },
          { name: 'code', type: 'varchar' },
          { name: 'discountType', type: 'discount_type_enum' },
          { name: 'discountValue', type: 'numeric', precision: 10, scale: 2 },
          { name: 'maxUses', type: 'integer', isNullable: true },
          { name: 'usedCount', type: 'integer', default: 0 },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'expiresAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'coupons',
      new TableIndex({
        name: 'IDX_coupons_eventId_code',
        columnNames: ['eventId', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'coupons',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('coupons');
    await queryRunner.query(`DROP TYPE "discount_type_enum"`);
  }
}
