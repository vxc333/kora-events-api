import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseEventLink1748200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // courses: add event_id column
    await queryRunner.query(
      `ALTER TABLE courses ADD COLUMN IF NOT EXISTS "eventId" uuid REFERENCES events(id) ON DELETE SET NULL`,
    );
    // course_enrollments: make user_id nullable, add participant_id
    await queryRunner.query(
      `ALTER TABLE course_enrollments ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS "participantId" uuid`,
    );
    // Drop old unique index if exists
    await queryRunner
      .query(`DROP INDEX IF EXISTS "UQ_course_enrollments_userId_courseId"`)
      .catch(() => {});
    // module_completions: make user_id nullable, add participant_id
    await queryRunner.query(
      `ALTER TABLE module_completions ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE module_completions ADD COLUMN IF NOT EXISTS "participantId" uuid`,
    );
    await queryRunner
      .query(`DROP INDEX IF EXISTS "UQ_module_completions_userId_moduleId"`)
      .catch(() => {});
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE courses DROP COLUMN IF EXISTS "eventId"`);
    await queryRunner.query(
      `ALTER TABLE course_enrollments DROP COLUMN IF EXISTS "participantId"`,
    );
    await queryRunner.query(
      `ALTER TABLE course_enrollments ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE module_completions DROP COLUMN IF EXISTS "participantId"`,
    );
    await queryRunner.query(
      `ALTER TABLE module_completions ALTER COLUMN "userId" SET NOT NULL`,
    );
  }
}
