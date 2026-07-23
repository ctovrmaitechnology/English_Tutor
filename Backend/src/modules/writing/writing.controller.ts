import { Controller, Get, Param, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { WritingService } from './writing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('writing')
export class WritingController {
  constructor(private readonly writingService: WritingService) { }

  @UseGuards(JwtAuthGuard)
  @Get('completed-lessons')
  async getCompletedLessons(@Req() req) {
    return this.writingService.getCompletedLessons(req.user.id);
  }

  // GET /writing/completed-lesson-ids/user/:userId
  @UseGuards(JwtAuthGuard)
  @Get('completed-lesson-ids/user/:userId')
  async getCompletedLessonIds(@Param('userId') userId: string) {
    return this.writingService.getCompletedLessonIds(userId);
  }

  // GET /writing/attempts
  @UseGuards(JwtAuthGuard)
  @Get('attempts')
  async getAttempts(@Req() req) {
    return this.writingService.getAttempts(req.user.id);
  }

  // GET /writing/attempts/user/:userId
  @UseGuards(JwtAuthGuard)
  @Get('attempts/user/:userId')
  async getAttemptsByUserId(@Param('userId') userId: string) {
    return this.writingService.getAttempts(userId);
  }

  // GET /writing/attempts/:lessonId
  @UseGuards(JwtAuthGuard)
  @Get('attempts/:lessonId')
  async getAttemptsByLesson(@Param('lessonId') lessonId: string, @Req() req) {
    return this.writingService.getAttemptsByLesson(req.user.id, lessonId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('questions/:lessonId')
  async getQuestions(@Param('lessonId') lessonId: string, @Query('exclude') exclude: string, @Req() req) {
    return this.writingService.getQuestionsForLesson(lessonId, req.user.id, exclude);
  }

  @UseGuards(JwtAuthGuard)
  @Post('questions')
  async addQuestions(@Body() body: any) {
    const questions = Array.isArray(body) ? body : body.questions;
    return this.writingService.addQuestions(questions);
  }

  @UseGuards(JwtAuthGuard)
  @Post('evaluate-part-b')
  async evaluatePartB(@Body() body: { transcript: string; question: string }) {
    return this.writingService.evaluatePartB(body.transcript, body.question);
  }
}
