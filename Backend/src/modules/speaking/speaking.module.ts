import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SpeakingBeginner } from './entities/speaking-beginner.entity';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { SpeakingSeedService } from './seeds/speaking-beginner.seed';
import { SeedController } from './seed.controller';
import { SpeakingService } from './speaking.service';
import { SpeakingController } from './speaking.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpeakingBeginner, AttemptLesson])],

  controllers: [SeedController, SpeakingController],

  providers: [SpeakingSeedService, SpeakingService],
})
export class SpeakingModule {}