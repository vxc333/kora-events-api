import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeWorkloadHoursNullable1746200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "workloadHours" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "events" SET "workloadHours" = 0 WHERE "workloadHours" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ALTER COLUMN "workloadHours" SET NOT NULL`,
    );
  }
}
