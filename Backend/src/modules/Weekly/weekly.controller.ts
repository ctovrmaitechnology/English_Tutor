import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { WeeklyService } from './weekly.service';

@Controller('weekly')
export class WeeklyController {
  constructor(private readonly weeklyService: WeeklyService) {}

  @Get('generate/:userId')
  async generateWeeklyTest(@Param('userId') userId: string) {
    return this.weeklyService.generateWeeklyTest(userId);
  }

  @Post('submit')
  async submitWeeklyScore(
    @Body()
    body: {
      userId: string;
      username?: string;
      modulesCovered: string[];
      lessonsCovered: string[];
      score: number;
    },
  ) {
    return this.weeklyService.saveWeeklyScore(
      body.userId,
      body.username,
      body.modulesCovered,
      body.lessonsCovered,
      body.score,
    );
  }
  @Post('evaluate-speech')
  async evaluateSpeech(
    @Body()
    body: {
      transcript: string;
      instruction: string;
    },
  ) {
    const result = await this.weeklyService.evaluateSpeech(body.transcript, body.instruction);
    return result;
  }
}
