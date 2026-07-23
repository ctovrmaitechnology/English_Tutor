import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';

@Injectable()
export class MyProgressService {
  constructor(
    @InjectRepository(AttemptLesson)
    private readonly attemptLessonRepo: Repository<AttemptLesson>,
  ) {}

  async getMyProgress(userId: string) {
    const attempts = await this.attemptLessonRepo.find({
      where: { userId, status: 'completed' },
      order: { createdAt: 'ASC' },
    });

    return { attempts };
  }
}