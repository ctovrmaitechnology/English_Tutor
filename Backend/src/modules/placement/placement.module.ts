import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBank } from './entities/question-bank.entity';
import { PlacementAttempt } from './entities/placement-attempt.entity';
import { PlacementResponse } from './entities/placement-response.entity';
import { PlacementTest } from './entities/placement-test.entity';
import { PlacementService } from './placement.service';
import { PlacementController } from './placement.controller';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlacementAttempt,
      PlacementResponse,
      QuestionBank,
      PlacementTest,
    ]),
    GeminiModule,
  ],
  controllers: [PlacementController],
  providers: [PlacementService],
  exports: [TypeOrmModule, PlacementService],
})
export class PlacementModule {}