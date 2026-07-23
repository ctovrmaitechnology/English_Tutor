import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModuleQuestion } from './entities/module-question.entity';
import { ModuleAssessment } from './entities/module-assessment.entity';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModuleQuestion, ModuleAssessment]),
  ],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
