import { Controller, Post, Get, Param, Body, Req, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { VocabularyService } from './vocabulary.service';
import { StartGameDto } from '../dto/start-game.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

@ApiTags('Vocabulary Games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  // ── Word Chain ───────────────────────────────────────────────
  @Post('word-chain/start')
  @ApiOperation({ summary: 'Start Word Chain game' })
  startWordChain(@Body() dto: StartGameDto, @Req() req) {
    return this.vocabularyService.startWordChain(req.user.id, dto);
  }

  @Post('word-chain/:sessionId/turn')
  @ApiOperation({ summary: 'Submit a word in Word Chain' })
  playWordChain(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.vocabularyService.playWordChain(req.user.id, sessionId, dto);
  }

  // ── Synonym Storm ────────────────────────────────────────────
  @Post('synonym-storm/start')
  @ApiOperation({ summary: 'Start Synonym Storm game' })
  startSynonymStorm(@Body() dto: StartGameDto, @Req() req) {
    return this.vocabularyService.startSynonymStorm(req.user.id, dto);
  }

  @Post('synonym-storm/:sessionId/submit')
  @ApiOperation({ summary: 'Submit synonyms (comma-separated)' })
  submitSynonymStorm(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.vocabularyService.submitSynonymStorm(req.user.id, sessionId, dto);
  }

  // ── Word Amnesia ─────────────────────────────────────────────
  @Post('word-amnesia/start')
  @ApiOperation({ summary: 'Start Word Amnesia game (10 questions)' })
  startWordAmnesia(@Body() dto: StartGameDto, @Req() req) {
    return this.vocabularyService.startWordAmnesia(req.user.id, dto);
  }

  @Post('word-amnesia/:sessionId/answer')
  @ApiOperation({ summary: 'Answer Word Amnesia question (send option index 0-3)' })
  answerWordAmnesia(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.vocabularyService.answerWordAmnesia(req.user.id, sessionId, dto);
  }

  // ── Vocabulary Speed Run ─────────────────────────────────────
  @Post('speed-run/start')
  @ApiOperation({ summary: 'Start Vocabulary Speed Run (10 words)' })
  startSpeedRun(@Body() dto: StartGameDto, @Req() req) {
    return this.vocabularyService.startSpeedRun(req.user.id, dto);
  }

  @Post('speed-run/:sessionId/answer')
  @ApiOperation({ summary: 'Submit meaning for current word' })
  answerSpeedRun(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.vocabularyService.answerSpeedRun(req.user.id, sessionId, dto);
  }

  // ── Stats ────────────────────────────────────────────────────
  @Get('personal-best')
  @ApiOperation({ summary: 'Get personal best scores for all vocabulary games' })
  getPersonalBest(@Req() req) {
    return this.vocabularyService.getPersonalBest(req.user.id);
  }
}