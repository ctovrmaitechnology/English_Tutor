import {
  Controller, Get, Post, Body, Param,
  UseGuards, Request, HttpStatus, HttpCode,
  UseInterceptors, UploadedFile, Headers, UnauthorizedException,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';
import { AssessmentService } from './assessment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiBearerAuth, ApiOperation, ApiResponse,
  ApiTags, ApiConsumes, ApiBody, ApiExcludeEndpoint,
} from '@nestjs/swagger';

@ApiTags('Assessment & Progress')
@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  // ── Seeding ──────────────────────────────────────────────────────────────
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Admin only: Seed 300 MCQ + speaking passages into the database' })
  async seedQuestions(@Headers('x-admin-secret') adminSecret?: string) {
    const expectedSecret = process.env.ADMIN_SEED_SECRET;
    if (!adminSecret || !expectedSecret) {
      throw new UnauthorizedException('Admin seed credentials missing or unconfigured');
    }
    const secretBuf = Buffer.from(adminSecret);
    const expectedBuf = Buffer.from(expectedSecret);
    if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
      throw new UnauthorizedException('Invalid admin seed credentials');
    }
    return this.assessmentService.seedQuestions(true);
  }

  // ── Progress ─────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('progress')
  @ApiOperation({ summary: 'Get completed lesson submodule IDs for the current user' })
  async getProgress(@Request() req) {
    return this.assessmentService.getProgress(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('progress')
  @ApiOperation({ summary: 'Mark a lesson submodule as completed or uncompleted' })
  async completeSubModule(
    @Request() req,
    @Body() body: { category: string; moduleId: string; subModuleId: string; completed?: boolean },
  ) {
    return this.assessmentService.completeSubModule(
      req.user.id, body.category, body.moduleId, body.subModuleId, body.completed ?? true,
    );
  }

  // ── Gating Status ─────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('status')
  @ApiOperation({ summary: 'Get status of assessments, certifications, locks and unlocked states' })
  async getStatus(@Request() req) {
    return this.assessmentService.getStatus(req.user.id);
  }

  // ── Lesson Question (Speaking Prompt / Writing Quiz) ─────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('lesson-question/:sectionId')
  @ApiOperation({ summary: 'Get the lesson question or prompt for a given section/session ID' })
  async getLessonQuestion(@Param('sectionId') sectionId: string) {
    return this.assessmentService.getLessonQuestion(sectionId);
  }

  // ── Get Questions for Level ───────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('questions/:category/:level')
  @ApiOperation({
    summary: 'Get 5 randomized, non-repeated questions for the user at given category and level',
    description: `
      For **speaking**: returns 5 passages (questionText) the user must read aloud.
      Each question has: { id, questionText, explanation (tip) }
      
      For **writing**: returns 5 MCQ questions with options array.
    `,
  })
  async getQuestions(
    @Request() req,
    @Param('category') category: 'speaking' | 'writing',
    @Param('level') level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
  ) {
    return this.assessmentService.getQuestionsForUser(req.user.id, category, level);
  }

  // ────────────────────────────────────────────────────────────────────────
  // ── NEW: Speaking STT — Transcribe One Passage ──────────────────────────
  // POST /assessment/speaking/transcribe/:questionId
  //
  // For each of the 5 speaking questions, the frontend:
  //   1. Shows the passage (questionText) — user reads it aloud
  //   2. Records audio → uploads it here
  //   3. Gets back { questionId, transcript, similarityScore }
  //   4. Repeats for all 5 passages
  //   5. Calls POST /assessment/submit/speaking/:level with collected scores
  // ────────────────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('speaking/transcribe/:questionId')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'STT: Upload audio of user reading a passage — returns transcript + similarity score',
    description: `
      Whisper transcribes the audio and computes a text-similarity score (0–100)
      comparing the transcript to the expected passage text stored in the DB.
      
      **similarityScore** is what you pass as the answer value when calling
      POST /assessment/submit/speaking/:level.
      
      A score ≥ 70 counts as a correct reading (passing threshold).
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: { type: 'string', format: 'binary', description: 'Audio file (WAV/WEBM/MP3)' },
      },
      required: ['audio'],
    },
  })
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async transcribeSpeakingPassage(
    @Param('questionId') questionId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /audio\/(wav|webm|mpeg|mp3|ogg|x-wav)/ }),
        ],
      }),
    ) file: Express.Multer.File,
  ) {
    if (!file) {
      return { error: 'No audio file uploaded. Send audio as multipart/form-data field "audio".' };
    }
    return this.assessmentService.transcribeSpeakingPassage(
      questionId,
      file.buffer,
      file.originalname,
    );
  }

  // ── Submit Answers ────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('submit/:category/:level')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit answers/scores for evaluation',
    description: `
      **For speaking**: pass \`{ answers: { [questionId]: similarityScore } }\` 
      where similarityScore comes from POST /assessment/speaking/transcribe/:questionId.
      Score ≥ 70 counts as correct for each passage.
      
      **For writing**: pass \`{ answers: { [questionId]: selectedOptionIndex } }\`.
    `,
  })
  async submitAnswers(
    @Request() req,
    @Param('category') category: 'speaking' | 'writing',
    @Param('level') level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    @Body() body: {
      answers: Record<string, number>;
      feedbacks?: Record<string, string>;
      transcripts?: Record<string, string>;
    },
  ) {
    return this.assessmentService.submitAnswers(
      req.user.id,
      category,
      level,
      body.answers,
      body.feedbacks,
      body.transcripts,
    );
  }

  // ── Retake Assessment ──────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('retake/:category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset assessment attempts for a category to allow retaking' })
  async retakeAssessment(
    @Request() req,
    @Param('category') category: 'speaking' | 'writing',
  ) {
    return this.assessmentService.retakeAssessment(req.user.id, category);
  }

  // ── Reset Module Progress ──────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('reset-module/:moduleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset progress for a specific module' })
  async resetModuleProgress(
    @Request() req,
    @Param('moduleId') moduleId: string,
  ) {
    return this.assessmentService.resetModuleProgress(req.user.id, moduleId);
  }
}