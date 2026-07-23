import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { ModuleQuestion } from '../assessment/entities/module-question.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttemptLesson, ModuleQuestion])
  ],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
