import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGameSessionsTable1781005155615 implements MigrationInterface {
    name = 'CreateGameSessionsTable1781005155615'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "game_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "gameType" character varying NOT NULL, "category" character varying NOT NULL, "difficulty" character varying NOT NULL DEFAULT 'BEGINNER', "score" integer NOT NULL DEFAULT '0', "maxScore" integer NOT NULL DEFAULT '0', "accuracy" double precision NOT NULL DEFAULT '0', "xpEarned" integer NOT NULL DEFAULT '0', "duration" integer NOT NULL DEFAULT '0', "completed" boolean NOT NULL DEFAULT false, "gameData" jsonb NOT NULL DEFAULT '{}', "answers" jsonb NOT NULL DEFAULT '[]', "startedAt" TIMESTAMP NOT NULL DEFAULT now(), "completedAt" TIMESTAMP, CONSTRAINT "PK_e25fa82d55744e55000c3288fdc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "game_sessions" ADD CONSTRAINT "FK_6fafb2f50848b51f214a1cbce2f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game_sessions" DROP CONSTRAINT "FK_6fafb2f50848b51f214a1cbce2f"`);
        await queryRunner.query(`DROP TABLE "game_sessions"`);
    }

}
