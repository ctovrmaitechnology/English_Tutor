import { Controller, Get, Param, Post, Body, Req, UseGuards } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('lesson')
export class LessonController {
  constructor(private readonly lessonService: LessonService) { }

  // POST /lesson/attempt — Save unified lesson attempt (speaking or writing)
  @UseGuards(JwtAuthGuard)
  @Post('attempt')
  async saveAttempt(
    @Req() req,
    @Body()
    body: {
      moduleId: string;
      lessonId?: string;
      level?: string;
      set?: string;
      partAScore?: number;
      partBScore?: number;
      score?: number;
      responses?: any;
    },
  ) {
    const user = req.user;
    return this.lessonService.saveAttempt({
      userId: user.id,
      username: user.username,
      moduleId: body.moduleId,
      lessonId: body.lessonId || body.moduleId,
      level: body.level,
      set: body.set,
      partAScore: body.partAScore,
      partBScore: body.partBScore,
      score: body.score,
      responses: body.responses,
    });
  }

  // GET /lesson/completed-lessons
  @UseGuards(JwtAuthGuard)
  @Get('completed-lessons')
  async getCompletedLessons(@Req() req) {
    return this.lessonService.getCompletedLessons(req.user.id);
  }

  // GET /lesson/completed-lesson-ids/user/:userId
  @UseGuards(JwtAuthGuard)
  @Get('completed-lesson-ids/user/:userId')
  async getCompletedLessonIds(@Param('userId') userId: string) {
    return this.lessonService.getCompletedLessonIds(userId);
  }

  // GET /lesson/incomplete/:lessonId — get active incomplete attempt for logged in user
  @UseGuards(JwtAuthGuard)
  @Get('incomplete/:lessonId')
  async getIncompleteAttempt(@Req() req, @Param('lessonId') lessonId: string) {
    return this.lessonService.getIncompleteAttempt(req.user.id, lessonId);
  }

  // GET /lesson/attempts — all attempts for logged-in user
  @UseGuards(JwtAuthGuard)
  @Get('attempts')
  async getAttempts(@Req() req) {
    return this.lessonService.getAttempts(req.user.id);
  }

  // GET /lesson/attempts/user/:userId — all attempts for a specific user (admin)
  @UseGuards(JwtAuthGuard)
  @Get('attempts/user/:userId')
  async getAttemptsByUserId(@Param('userId') userId: string) {
    return this.lessonService.getAttempts(userId);
  }

  // GET /lesson/attempts/:lessonId — attempts for a specific lesson
  @UseGuards(JwtAuthGuard)
  @Get('attempts/:lessonId')
  async getAttemptsByLesson(@Param('lessonId') lessonId: string, @Req() req) {
    return this.lessonService.getAttemptsByLesson(req.user.id, lessonId);
  }
}
