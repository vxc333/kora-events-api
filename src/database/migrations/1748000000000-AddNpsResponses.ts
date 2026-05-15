import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNpsResponses1748000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "nps_responses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "participantId" uuid,
        "score" integer NOT NULL,
        "comment" text,
        "respondentToken" varchar NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_nps_responses_respondentToken" UNIQUE ("respondentToken"),
        CONSTRAINT "PK_nps_responses" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "nps_responses"`);
  }
}
