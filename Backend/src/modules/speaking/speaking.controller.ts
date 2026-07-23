import { Controller, Get, Param, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { SpeakingService } from './speaking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('speaking')
export class SpeakingController {
  constructor(private readonly speakingService: SpeakingService) { }

  @UseGuards(JwtAuthGuard)
  @Get('completed-lessons')
  async getCompletedLessons(@Req() req) {
    return this.speakingService.getCompletedLessons(req.user.id);
  }

  // GET /speaking/completed-lesson-ids/user/:userId
  @UseGuards(JwtAuthGuard)
  @Get('completed-lesson-ids/user/:userId')
  async getCompletedLessonIds(@Param('userId') userId: string) {
    return this.speakingService.getCompletedLessonIds(userId);
  }

  // GET /speaking/attempts
  @UseGuards(JwtAuthGuard)
  @Get('attempts')
  async getAttempts(@Req() req) {
    return this.speakingService.getAttempts(req.user.id);
  }

  // GET /speaking/attempts/user/:userId
  @UseGuards(JwtAuthGuard)
  @Get('attempts/user/:userId')
  async getAttemptsByUserId(@Param('userId') userId: string) {
    return this.speakingService.getAttempts(userId);
  }

  // GET /speaking/attempts/:lessonId
  @UseGuards(JwtAuthGuard)
  @Get('attempts/:lessonId')
  async getAttemptsByLesson(@Param('lessonId') lessonId: string, @Req() req) {
    return this.speakingService.getAttemptsByLesson(req.user.id, lessonId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('questions/:lessonId')
  async getQuestions(
    @Param('lessonId') lessonId: string,
    @Query('exclude') exclude: string,
    @Query('set') setParam: string,
    @Req() req,
  ) {
    return this.speakingService.getQuestionsForLesson(lessonId, req.user.id, exclude, setParam);
  }

  @UseGuards(JwtAuthGuard)
  @Post('evaluate-part-b')
  async evaluatePartB(@Body() body: { transcript: string; question: string }) {
    return this.speakingService.evaluatePartB(body.transcript, body.question);
  }
}
