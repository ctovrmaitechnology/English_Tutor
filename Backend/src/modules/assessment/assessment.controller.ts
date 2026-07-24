import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleQuestion } from './entities/module-question.entity';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  // ─────────────────────────────────────────────────────────────────
  // QUESTION MANAGEMENT (Admin)
  // ─────────────────────────────────────────────────────────────────

  /**
   * POST /assessment/admin/questions/upload
   * Body: array of question objects
   *
   * Example payload:
   * [
   *   {
   *     "moduleId": "sp-1",
   *     "lessonId": "sp-1-1",
   *     "level": "BEGINNER",
   *     "set": "SET_1",
   *     "part": "PART_A",
   *     "questionNumber": 1,
   *     "marks": 1,
   *     "question": "Which is the correct greeting?",
   *     "optionA": "Good morning",
   *     "optionB": "Good cheese",
   *     "optionC": "Good road",
   *     "optionD": "Good sleep",
   *     "correctOption": "A",
   *     "answer": "Good morning"
   *   },
   *   {
   *     "moduleId": "sp-1",
   *     "lessonId": "sp-1-1",
   *     "level": "BEGINNER",
   *     "set": "SET_1",
   *     "part": "PART_B",
   *     "questionNumber": 1,
   *     "marks": 5,
   *     "question": "Describe how you would greet a customer.",
   *     "explanation": "Speak naturally for 30 seconds"
   *   }
   * ]
   */
  @UseGuards(JwtAuthGuard)
  @Post('admin/questions/upload')
  async uploadQuestions(@Body() body: Partial<ModuleQuestion>[]) {
    return this.assessmentService.uploadQuestions(body);
  }

  /**
   * DELETE /assessment/admin/questions/:moduleId
   * Deletes all questions for a given moduleId or lessonId
   */
  @UseGuards(JwtAuthGuard)
  @Delete('admin/questions/:moduleId')
  async deleteQuestions(@Param('moduleId') moduleId: string) {
    return this.assessmentService.deleteQuestionsForModule(moduleId);
  }

  // ─────────────────────────────────────────────────────────────────
  // STUDENT QUESTION FETCH
  // ─────────────────────────────────────────────────────────────────

  /**
   * GET /assessment/questions/:lessonId
   * Returns part A + part B questions for the lesson (unused set rotation)
   * Query: ?exclude=SET_1  (optional — exclude a specific set)
   */
  @UseGuards(JwtAuthGuard)
  @Get('questions/:lessonId')
  async getQuestions(
    @Param('lessonId') lessonId: string,
    @Query('exclude') exclude: string,
    @Req() req,
  ) {
    return this.assessmentService.getQuestionsForLesson(lessonId, req.user.id, exclude);
  }

  // ─────────────────────────────────────────────────────────────────
  // SAVE ATTEMPT
  // ─────────────────────────────────────────────────────────────────

  /**
   * POST /assessment/attempt
   * Body: {
   *   moduleId, lessonId, level, set,
   *   partAScore, partBScore?,
   *   responses: { partA: {...}, partB: {...} },
   *   status?: 'completed'|'incomplete'
   * }
   */
  @UseGuards(JwtAuthGuard)
  @Post('attempt')
  async saveAttempt(@Body() body: any, @Req() req) {
    return this.assessmentService.saveAssessment({
      userId: req.user.id,
      username: req.user.username || req.user.name || '',
      moduleId: body.moduleId,
      lessonId: body.lessonId,
      level: body.level || 'BEGINNER',
      set: body.set,
      partAScore: body.partAScore,
      partBScore: body.partBScore,
      responses: body.responses,
      status: body.status,
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // STUDENT ATTEMPT HISTORY
  // ─────────────────────────────────────────────────────────────────

  /** GET /assessment/attempts  — current user's attempts */
  @UseGuards(JwtAuthGuard)
  @Get('attempts')
  async getMyAttempts(@Req() req) {
    return this.assessmentService.getAssessmentsByUser(req.user.id);
  }

  /** GET /assessment/attempts/:lessonId  — filter by lesson */
  @UseGuards(JwtAuthGuard)
  @Get('attempts/:lessonId')
  async getAttemptsByLesson(@Param('lessonId') lessonId: string, @Req() req) {
    return this.assessmentService.getAssessmentsByLesson(req.user.id, lessonId);
  }

  /** GET /assessment/completed-lessons  — list of completed lesson IDs */
  @UseGuards(JwtAuthGuard)
  @Get('completed-lessons')
  async getCompletedLessons(@Req() req) {
    return this.assessmentService.getCompletedLessons(req.user.id);
  }

  /** GET /assessment/status — overall user assessment & certificate status */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Req() req) {
    return this.assessmentService.getStatus(req.user.id);
  }

  // ─────────────────────────────────────────────────────────────────
  // ADMIN VIEW
  // ─────────────────────────────────────────────────────────────────

  /** GET /assessment/admin/attempts/:userId  — all attempts for a user */
  @UseGuards(JwtAuthGuard)
  @Get('admin/attempts/:userId')
  async getAttemptsByUser(@Param('userId') userId: string) {
    return this.assessmentService.getAssessmentsByUserAdmin(userId);
  }
}
