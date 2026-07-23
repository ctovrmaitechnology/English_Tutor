import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyAssessment } from './entities/weekly-assessment.entity';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { SpeakingBeginner } from '../speaking/entities/speaking-beginner.entity';
import { WeeklyController } from './weekly.controller';
import { WeeklyService } from './weekly.service';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WeeklyAssessment,
      AttemptLesson,
      SpeakingBeginner,
    ]),
    GeminiModule,
  ],
  controllers: [WeeklyController],
  providers: [WeeklyService],
  exports: [WeeklyService],
})
export class WeeklyModule {}
