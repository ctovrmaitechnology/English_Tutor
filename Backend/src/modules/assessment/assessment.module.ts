import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Existing entities
import { ModuleProgress } from './entities/module-progress.entity';
import { AssessmentQuestion } from './entities/assessment-question.entity';
import { AssessmentAttempt } from './entities/assessment-attempt.entity';
import { LessonQuestion } from './entities/lesson-question.entity';
import { User } from '../users/user.entity';
import { Certificate } from './entities/certificate.entity';

// ── NEW ──────────────────────────────────────────────────────────────────────
import { SpeakingSession } from './entities/speaking-session.entity';

// Existing
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { GeminiModule } from '../gemini/gemini.module';

// ── NEW ──────────────────────────────────────────────────────────────────────
import { SpeakingAssessmentService } from './speaking-assessment.service';
import { SpeakingAssessmentController } from './speaking-assessment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModuleProgress,
      AssessmentQuestion,
      AssessmentAttempt,
      LessonQuestion,
      User,
      Certificate,
      SpeakingSession,   // ← new
    ]),
    GeminiModule,
  ],
  providers: [
    AssessmentService,
    SpeakingAssessmentService,   // ← new
  ],
  controllers: [
    AssessmentController,
    SpeakingAssessmentController, // ← new
  ],
  exports: [
    AssessmentService,
    SpeakingAssessmentService,   // ← new
  ],
})
export class AssessmentModule {}