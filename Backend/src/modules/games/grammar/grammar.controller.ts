import {
  Controller, Post, Get, Param,
  Body, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GrammarService } from './grammar.service';
import { StartGameDto } from '../dto/start-game.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

@ApiTags('Grammar Games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/grammar')
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  // ── Grammar Ninja ────────────────────────────────────────────
  @Post('grammar-ninja/start')
  @ApiOperation({ summary: 'Start Grammar Ninja — tap the wrong word' })
  startGrammarNinja(@Body() dto: StartGameDto, @Req() req) {
    return this.grammarService.startGrammarNinja(req.user.id, dto);
  }

  @Post('grammar-ninja/:sessionId/answer')
  @ApiOperation({ summary: 'Submit tapped word index (0-based)' })
  answerGrammarNinja(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.grammarService.answerGrammarNinja(req.user.id, sessionId, dto);
  }

  // ── Sentence Surgeon ─────────────────────────────────────────
  @Post('sentence-surgeon/start')
  @ApiOperation({ summary: 'Start Sentence Surgeon — arrange jumbled words' })
  startSentenceSurgeon(@Body() dto: StartGameDto, @Req() req) {
    return this.grammarService.startSentenceSurgeon(req.user.id, dto);
  }

  @Post('sentence-surgeon/:sessionId/answer')
  @ApiOperation({ summary: 'Submit arranged sentence' })
  answerSentenceSurgeon(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.grammarService.answerSentenceSurgeon(req.user.id, sessionId, dto);
  }

  @Get('sentence-surgeon/:sessionId/hint')
  @ApiOperation({ summary: 'Get hint (-3 points)' })
  getHint(@Param('sessionId') sessionId: string, @Req() req) {
    return this.grammarService.getSentenceSurgeonHint(req.user.id, sessionId);
  }

  // ── Error Hunt ───────────────────────────────────────────────
  @Post('error-hunt/start')
  @ApiOperation({ summary: 'Start Error Hunt — find grammar mistakes' })
  startErrorHunt(@Body() dto: StartGameDto, @Req() req) {
    return this.grammarService.startErrorHunt(req.user.id, dto);
  }

  @Post('error-hunt/:sessionId/submit')
  @ApiOperation({
    summary: 'Submit found errors as JSON array: [{ errorWord, correction }]',
  })
  submitErrorHunt(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.grammarService.submitErrorHunt(req.user.id, sessionId, dto);
  }

  // ── Tense Transformer ────────────────────────────────────────
  @Post('tense-transformer/start')
  @ApiOperation({ summary: 'Start Tense Transformer — change sentence tense' })
  startTenseTransformer(@Body() dto: StartGameDto, @Req() req) {
    return this.grammarService.startTenseTransformer(req.user.id, dto);
  }

  @Post('tense-transformer/:sessionId/answer')
  @ApiOperation({ summary: 'Submit transformed sentence' })
  answerTenseTransformer(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.grammarService.answerTenseTransformer(
      req.user.id, sessionId, dto,
    );
  }

  // ── Stats ────────────────────────────────────────────────────
  @Get('personal-best')
  @ApiOperation({ summary: 'Personal best for all grammar games' })
  getPersonalBest(@Req() req) {
    return this.grammarService.getPersonalBest(req.user.id);
  }
}