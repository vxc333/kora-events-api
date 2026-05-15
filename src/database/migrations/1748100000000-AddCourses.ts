import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourses1748100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "courses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizerId" uuid NOT NULL,
        "title" varchar NOT NULL,
        "description" text,
        "coverUrl" varchar,
        "totalDuration" integer NOT NULL DEFAULT 0,
        "minimumCompletion" integer NOT NULL DEFAULT 80,
        "isPublished" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_courses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "course_modules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "courseId" uuid NOT NULL,
        "title" varchar NOT NULL,
        "videoUrl" varchar,
        "duration" integer NOT NULL DEFAULT 0,
        "order" integer NOT NULL,
        "hasQuiz" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_modules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_course_modules_courseId" FOREIGN KEY ("courseId")
          REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "quiz_questions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "moduleId" uuid NOT NULL,
        "question" text NOT NULL,
        "options" jsonb NOT NULL,
        "correctIndex" integer NOT NULL,
        "order" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quiz_questions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quiz_questions_moduleId" FOREIGN KEY ("moduleId")
          REFERENCES "course_modules"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "course_enrollments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "courseId" uuid NOT NULL,
        "certificateAvailable" boolean NOT NULL DEFAULT false,
        "enrolledAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_course_enrollments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_course_enrollments_userId_courseId" UNIQUE ("userId", "courseId"),
        CONSTRAINT "FK_course_enrollments_courseId" FOREIGN KEY ("courseId")
          REFERENCES "courses"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "module_completions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "moduleId" uuid NOT NULL,
        "passed" boolean NOT NULL DEFAULT false,
        "completedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_module_completions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_module_completions_userId_moduleId" UNIQUE ("userId", "moduleId"),
        CONSTRAINT "FK_module_completions_moduleId" FOREIGN KEY ("moduleId")
          REFERENCES "course_modules"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "module_completions"`);
    await queryRunner.query(`DROP TABLE "course_enrollments"`);
    await queryRunner.query(`DROP TABLE "quiz_questions"`);
    await queryRunner.query(`DROP TABLE "course_modules"`);
    await queryRunner.query(`DROP TABLE "courses"`);
  }
}
