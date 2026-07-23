import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpeakingBeginner } from '../entities/speaking-beginner.entity';

@Injectable()
export class SpeakingSeedService {
  constructor(
    @InjectRepository(SpeakingBeginner)
    private readonly repo: Repository<SpeakingBeginner>,
  ) {}

  async seed(data?: Partial<SpeakingBeginner>[]) {
    if (!data || data.length === 0) {
      throw new BadRequestException('No questions provided in the request body.');
    }

    await this.repo.save(data);
    console.log(`Saved ${data.length} questions from request body.`);
    return { inserted: data.length };
  }
}