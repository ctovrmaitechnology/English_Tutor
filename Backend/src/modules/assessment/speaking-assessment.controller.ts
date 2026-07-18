import {
  Controller, Post, Get,
  Param, Req, UseGuards,
  UseInterceptors, UploadedFile,
  HttpCode, HttpStatus,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpeakingAssessmentService } from './speaking-assessment.service';

interface UploadedAudioFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('Speaking Assessment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessment/speaking')
export class SpeakingAssessmentController {
  constructor(private readonly svc: SpeakingAssessmentService) {}

  // ─── BEGINNER ─────────────────────────────────────────────────────────────

  @Post('beginner/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start Beginner speaking test — returns 5 read-aloud passages',
    description:
      'Creates a session. Returns the first passage text + tip. ' +
      'Call POST /beginner/:sessionId/submit with audio for each passage.',
  })
  beginnerStart(@Req() req) {
    return this.svc.beginnerStart(req.user.id);
  }

  @Post('beginner/:sessionId/submit')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Submit one read-aloud recording — advances to next passage',
    description:
      'Upload field name: **audio** (WAV / WEBM / MP3). ' +
      'Returns similarity score + feedback. When all 5 done, returns final result.',
  })
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  beginnerSubmit(
    @Param('sessionId') sessionId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /audio\/(wav|webm|mpeg|mp3|ogg|x-wav)/ }),
        ],
      }),
    ) file: UploadedAudioFile,
    @Req() req,
  ) {
    return this.svc.beginnerSubmit(
      req.user.id,
      sessionId,
      file.buffer,
      file.originalname,
    );
  }

  // ─── INTERMEDIATE ─────────────────────────────────────────────────────────

  @Post('intermediate/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start Intermediate speaking test — AI generates 5 BPO scenarios',
    description:
      'Returns scenario 1 context + AI customer\'s first line as text + base64 WAV audio. ' +
      'Call POST /intermediate/:sessionId/reply with your audio response.',
  })
  intermediateStart(@Req() req) {
    return this.svc.intermediateStart(req.user.id);
  }

  @Post('intermediate/:sessionId/reply')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Reply to AI customer — scored by Gemini on 5 criteria',
    description:
      'Upload field name: **audio**. ' +
      'Returns Gemini evaluation + AI customer\'s next line as audio. ' +
      '3 turns per scenario × 5 scenarios. Pass threshold: 80%.',
  })
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  intermediateReply(
    @Param('sessionId') sessionId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /audio\/(wav|webm|mpeg|mp3|ogg|x-wav)/ }),
        ],
      }),
    ) file: UploadedAudioFile,
    @Req() req,
  ) {
    return this.svc.intermediateReply(
      req.user.id,
      sessionId,
      file.buffer,
      file.originalname,
    );
  }

  // ─── ADVANCED ─────────────────────────────────────────────────────────────

  @Post('advanced/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start Advanced speaking test — 5 high-stakes BPO topics',
    description:
      'Returns topic 1 situation briefing + AI\'s opening challenge as audio. ' +
      'User speaks freely (up to 90 s). AI pushes back twice per topic. ' +
      'Gemini holistic rubric: fluency, persuasion, vocabulary, empathy, structure.',
  })
  advancedStart(@Req() req) {
    return this.svc.advancedStart(req.user.id);
  }

  @Post('advanced/:sessionId/reply')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Reply to AI — holistic Gemini rubric, AI pushes back up to 2×',
    description:
      'Upload field name: **audio**. ' +
      '3 turns per topic × 5 topics. Pass threshold: 75%.',
  })
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  advancedReply(
    @Param('sessionId') sessionId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /audio\/(wav|webm|mpeg|mp3|ogg|x-wav)/ }),
        ],
      }),
    ) file: UploadedAudioFile,
    @Req() req,
  ) {
    return this.svc.advancedReply(
      req.user.id,
      sessionId,
      file.buffer,
      file.originalname,
    );
  }

  // ─── STATUS ───────────────────────────────────────────────────────────────

  @Get(':level/session/:sessionId')
  @ApiOperation({ summary: 'Get current state of a speaking session' })
  getSessionStatus(
    @Param('sessionId') sessionId: string,
    @Req() req,
  ) {
    return this.svc.getSessionStatus(req.user.id, sessionId);
  }
}
