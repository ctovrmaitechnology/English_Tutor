import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSpeakingSessionsTable1781200000000 implements MigrationInterface {
  name = 'CreateSpeakingSessionsTable1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing table if it was created by a previous/failed run to prevent conflict
    await queryRunner.query(`DROP TABLE IF EXISTS "tutor_speaking_sessions" CASCADE`);
    
    await queryRunner.query(`
      CREATE TABLE "tutor_speaking_sessions" (
        "id"          uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "userId"      character varying NOT NULL,
        "level"       character varying NOT NULL,
        "completed"   boolean           NOT NULL DEFAULT false,
        "finalScore"  integer           NOT NULL DEFAULT 0,
        "passed"      boolean           NOT NULL DEFAULT false,
        "gameData"    jsonb             NOT NULL DEFAULT '{}',
        "createdAt"   TIMESTAMP         NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP,
        CONSTRAINT "PK_tutor_speaking_sessions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_speaking_sessions_userId" ON "tutor_speaking_sessions" ("userId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_speaking_sessions_userId"`);
    await queryRunner.query(`DROP TABLE "tutor_speaking_sessions"`);
  }
}
