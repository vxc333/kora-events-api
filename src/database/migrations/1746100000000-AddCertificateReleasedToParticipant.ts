import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCertificateReleasedToParticipant1746100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "participants" ADD COLUMN "certificateReleased" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "participants" DROP COLUMN "certificateReleased"`,
    );
  }
}
