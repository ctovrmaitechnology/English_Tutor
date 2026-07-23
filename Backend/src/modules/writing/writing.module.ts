import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WritingBeginner } from './entities/writing-beginner.entity';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { ModuleQuestion } from '../assessment/entities/module-question.entity';
import { WritingService } from './writing.service';
import { WritingController } from './writing.controller';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WritingBeginner, AttemptLesson, ModuleQuestion]),
    GeminiModule,
  ],
  controllers: [WritingController],
  providers: [WritingService],
  exports: [WritingService],
})
export class WritingModule {}
