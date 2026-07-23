import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttemptLesson } from './entities/attempt-lesson.entity';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AttemptLesson])],
  controllers: [LessonController],
  providers: [LessonService],
  exports: [LessonService, TypeOrmModule],
})
export class LessonModule {}
