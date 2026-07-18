import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuestionTypesToPlacement1784374811559 implements MigrationInterface {
    name = 'AddQuestionTypesToPlacement1784374811559'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const qTable = await queryRunner.getTable('placement_questions');

        // Safe renames for columns if they existed under previous names
        if (qTable?.findColumnByName('questionSet')) {
            await queryRunner.query(`ALTER TABLE "placement_questions" RENAME COLUMN "questionSet" TO "setName"`);
        } else if (!qTable?.findColumnByName('setName')) {
            await queryRunner.query(`ALTER TABLE "placement_questions" ADD COLUMN "setName" character varying(1)`);
        }

        if (qTable?.findColumnByName('setOrder')) {
            await queryRunner.query(`ALTER TABLE "placement_questions" RENAME COLUMN "setOrder" TO "orderInSet"`);
        } else if (!qTable?.findColumnByName('orderInSet')) {
            await queryRunner.query(`ALTER TABLE "placement_questions" ADD COLUMN "orderInSet" smallint`);
        }

        // ── placement_questions: new fields for mixed question types ──────
        await queryRunner.query(`
            ALTER TABLE "placement_questions"
            ADD COLUMN IF NOT EXISTS "questionType" character varying(30) NOT NULL DEFAULT 'mcq',
            ADD COLUMN IF NOT EXISTS "section" character varying(5),
            ADD COLUMN IF NOT EXISTS "sectionTitle" character varying(100),
            ADD COLUMN IF NOT EXISTS "marks" smallint NOT NULL DEFAULT 1,
            ADD COLUMN IF NOT EXISTS "correctAnswer" text,
            ADD COLUMN IF NOT EXISTS "modelAnswer" text,
            ADD COLUMN IF NOT EXISTS "passage" text,
            ADD COLUMN IF NOT EXISTS "responseMode" character varying(10) NOT NULL DEFAULT 'text'
        `);

        // options / correctOptionIndex were NOT NULL before — relax them,
        // since non-MCQ question types don't have multiple-choice options.
        await queryRunner.query(`
            ALTER TABLE "placement_questions"
            ALTER COLUMN "options" DROP NOT NULL,
            ALTER COLUMN "correctOptionIndex" DROP NOT NULL
        `);

        // ── placement_responses: support text/audio responses, unscored state ──
        const rTable = await queryRunner.getTable('placement_responses');
        if (rTable?.findColumnByName('userTextResponse')) {
            await queryRunner.query(`ALTER TABLE "placement_responses" RENAME COLUMN "userTextResponse" TO "textResponse"`);
        } else if (!rTable?.findColumnByName('textResponse')) {
            await queryRunner.query(`ALTER TABLE "placement_responses" ADD COLUMN "textResponse" text`);
        }

        await queryRunner.query(`
            ALTER TABLE "placement_responses"
            ADD COLUMN IF NOT EXISTS "isScored" boolean NOT NULL DEFAULT true
        `);

        await queryRunner.query(`
            ALTER TABLE "placement_responses"
            ALTER COLUMN "selectedOptionIndex" DROP NOT NULL,
            ALTER COLUMN "isCorrect" DROP NOT NULL
        `);

        // Create indexes on placement_questions if needed
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_placement_questions_set_order" ON "placement_questions" ("status", "setName", "orderInSet")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "placement_responses"
            ALTER COLUMN "selectedOptionIndex" SET NOT NULL,
            ALTER COLUMN "isCorrect" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "placement_responses"
            DROP COLUMN IF EXISTS "textResponse",
            DROP COLUMN IF EXISTS "isScored"
        `);

        await queryRunner.query(`
            ALTER TABLE "placement_questions"
            ALTER COLUMN "options" SET NOT NULL,
            ALTER COLUMN "correctOptionIndex" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "placement_questions"
            DROP COLUMN IF EXISTS "questionType",
            DROP COLUMN IF EXISTS "section",
            DROP COLUMN IF EXISTS "sectionTitle",
            DROP COLUMN IF EXISTS "marks",
            DROP COLUMN IF EXISTS "correctAnswer",
            DROP COLUMN IF EXISTS "modelAnswer",
            DROP COLUMN IF EXISTS "passage",
            DROP COLUMN IF EXISTS "responseMode"
        `);
    }
}
