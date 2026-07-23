import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateRemark } from './candidate-remark.entity';
import { CandidateRemarkService } from './candidate-remark.service';
import { CandidateRemarkController } from './candidate-remark.controller';
import { User } from '../users/user.entity';
import { ModuleProgress } from '../assessment/entities/module-progress.entity';
import { AssessmentAttempt } from '../assessment/entities/assessment-attempt.entity';
import { GameSession } from '../games/entities/game-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateRemark,
      User,
      ModuleProgress,
      AssessmentAttempt,
      GameSession,
    ]),
  ],
  controllers: [CandidateRemarkController],
  providers: [CandidateRemarkService],
  exports: [CandidateRemarkService],
})
export class CandidateRemarkModule {}