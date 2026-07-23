import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { PracticeService } from './practice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @UseGuards(JwtAuthGuard)
  @Get('questions/:lessonId')
  async getPracticeQuestions(@Param('lessonId') lessonId: string, @Req() req) {
    return this.practiceService.getUniquePracticeQuestions(lessonId, req.user.id);
  }

  @Get('test-questions/:lessonId')
  async testPracticeQuestions(@Param('lessonId') lessonId: string) {
    // Hardcode a userId for testing (or pass in query)
    const testUserId = 'test-user-id';
    return this.practiceService.getUniquePracticeQuestions(lessonId, testUserId);
  }
}
