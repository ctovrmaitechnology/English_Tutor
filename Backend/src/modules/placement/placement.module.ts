import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacementQuestion } from './entities/placement-question.entity';
import { PlacementAttempt } from './entities/placement-attempt.entity';
import { PlacementResponse } from './entities/placement-response.entity';
import { PlacementQuestionSeederService } from './seed/placement-question-seeder.service';
import { PlacementService } from './placement.service';
import { PlacementController } from './placement.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlacementQuestion, PlacementAttempt, PlacementResponse]),
  ],
  controllers: [PlacementController],
  providers: [PlacementQuestionSeederService, PlacementService],
  exports: [TypeOrmModule, PlacementService],
})
export class PlacementModule {}