import { Controller, Post, Body } from '@nestjs/common';
import { SpeakingSeedService } from './seeds/speaking-beginner.seed';

@Controller('seed')
export class SeedController {
  constructor(
    private readonly speakingSeedService: SpeakingSeedService,
  ) {}

  @Post('beginner')
  async seedBeginner(@Body() body: any[]) {
    // If you send a JSON array in the body, it will save that.
    // If you send nothing, it falls back to the hardcoded file.
    await this.speakingSeedService.seed(body);

    return {
      message: 'Speaking Beginner seeded successfully',
    };
  }
}