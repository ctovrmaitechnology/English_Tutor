import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePlacementTables1784353221754 implements MigrationInterface {
    name = 'CreatePlacementTables1784353221754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── placement_questions: the ONE unified bank ─────────────────────────
        await queryRunner.query(`
            CREATE TABLE "placement_questions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "questionText" text NOT NULL,
                "options" jsonb NOT NULL,
                "correctOptionIndex" integer NOT NULL,
                "explanation" text,
                "skill" character varying(20) NOT NULL,
                "difficulty" smallint NOT NULL,
                "cefrLevel" character varying(5) NOT NULL,
                "topic" character varying(100),
                "tags" jsonb,
                "status" character varying(20) NOT NULL DEFAULT 'active',
                "questionGroupId" uuid,
                "version" integer NOT NULL DEFAULT 1,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_placement_questions" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_placement_questions_selection"
            ON "placement_questions" ("status", "skill", "difficulty")
        `);

        // ── placement_attempts ─────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "placement_attempts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying(26) NOT NULL,
                "attemptNumber" smallint NOT NULL DEFAULT 1,
                "status" character varying(20) NOT NULL DEFAULT 'in_progress',
                "totalQuestions" smallint NOT NULL,
                "currentQuestionIndex" smallint NOT NULL DEFAULT 0,
                "currentDifficulty" smallint NOT NULL DEFAULT 5,
                "totalScore" smallint,
                "skillScores" jsonb,
                "finalLevel" character varying(20),
                "confidenceScore" smallint,
                "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "completedAt" TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_placement_attempts" PRIMARY KEY ("id"),
                CONSTRAINT "FK_placement_attempts_user" FOREIGN KEY ("userId")
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_placement_attempts_user_status"
            ON "placement_attempts" ("userId", "status")
        `);

        // ── placement_responses ────────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "placement_responses" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "attemptId" uuid NOT NULL,
                "questionId" uuid NOT NULL,
                "questionOrder" smallint NOT NULL,
                "selectedOptionIndex" smallint NOT NULL,
                "isCorrect" boolean NOT NULL,
                "difficultyAtTime" smallint NOT NULL,
                "skill" character varying(20) NOT NULL,
                "responseTimeMs" integer,
                "answeredAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_placement_responses" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_placement_responses_attempt_question" UNIQUE ("attemptId", "questionId"),
                CONSTRAINT "FK_placement_responses_attempt" FOREIGN KEY ("attemptId")
                    REFERENCES "placement_attempts"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_placement_responses_question" FOREIGN KEY ("questionId")
                    REFERENCES "placement_questions"("id") ON DELETE RESTRICT
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_placement_responses_attempt"
            ON "placement_responses" ("attemptId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "placement_responses"`);
        await queryRunner.query(`DROP TABLE "placement_attempts"`);
        await queryRunner.query(`DROP TABLE "placement_questions"`);
    }
}
