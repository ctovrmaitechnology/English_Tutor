import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MyProgressController } from './my-progress.controller';
import { MyProgressService } from './my-progress.service';
import { BulkUploadController } from './bulk-upload.controller';
import { BulkUploadService } from './bulk-upload.service';
import { User } from '../users/user.entity';
import { ModuleProgress } from '../assessment/entities/module-progress.entity';
import { AssessmentAttempt } from '../assessment/entities/assessment-attempt.entity';
import { Certificate } from '../assessment/entities/certificate.entity';
import { SpeakingSession } from '../assessment/entities/speaking-session.entity';
import { GameSession } from '../games/entities/game-session.entity';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ModuleProgress,
      AssessmentAttempt,
      Certificate,
      SpeakingSession,
      GameSession,
      AttemptLesson,
    ]),
    SessionsModule,
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }), // 10MB max
  ],
  controllers: [AdminController, MyProgressController, BulkUploadController],
  providers: [AdminService, MyProgressService, BulkUploadService],
})
export class AdminModule {}