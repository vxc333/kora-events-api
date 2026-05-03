import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateCouponUsagesTable1714600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'coupon_usages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'couponId', type: 'uuid' },
          { name: 'participantId', type: 'uuid' },
          { name: 'usedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'coupon_usages',
      new TableForeignKey({
        columnNames: ['couponId'],
        referencedTableName: 'coupons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'coupon_usages',
      new TableForeignKey({
        columnNames: ['participantId'],
        referencedTableName: 'participants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('coupon_usages');
  }
}
