import {
  Controller, Post, Get,
  Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { BpoService } from './bpo.service';
import { StartGameDto } from '../dto/start-game.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

@ApiTags('BPO Scenario Games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/bpo')
export class BpoController {
  constructor(private readonly bpoService: BpoService) {}

  // ── Angry Customer ───────────────────────────────────────────
  @Post('angry-customer/start')
  @ApiOperation({ summary: 'Start Angry Customer simulation' })
  startAngryCustomer(@Body() dto: StartGameDto, @Req() req) {
    return this.bpoService.startAngryCustomer(req.user.id, dto);
  }

  @Post('angry-customer/:sessionId/reply')
  @ApiOperation({ summary: 'Send your response to the angry customer' })
  replyAngryCustomer(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.bpoService.replyAngryCustomer(req.user.id, sessionId, dto);
  }

  // ── Email Race ───────────────────────────────────────────────
  @Post('email-race/start')
  @ApiOperation({ summary: 'Start Email Race — get customer complaint' })
  startEmailRace(@Body() dto: StartGameDto, @Req() req) {
    return this.bpoService.startEmailRace(req.user.id, dto);
  }

  @Post('email-race/:sessionId/submit')
  @ApiOperation({ summary: 'Submit your email reply for scoring' })
  submitEmailRace(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.bpoService.submitEmailRace(req.user.id, sessionId, dto);
  }

  // ── Hold Music ───────────────────────────────────────────────
  @Post('hold-music/start')
  @ApiOperation({ summary: 'Start Hold Music — rapid scenario responses' })
  startHoldMusic(@Body() dto: StartGameDto, @Req() req) {
    return this.bpoService.startHoldMusic(req.user.id, dto);
  }

  @Post('hold-music/:sessionId/respond')
  @ApiOperation({ summary: 'Respond to current scenario' })
  answerHoldMusic(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.bpoService.answerHoldMusic(req.user.id, sessionId, dto);
  }

  // ── Jargon Master ────────────────────────────────────────────
  @Post('jargon-master/start')
  @ApiOperation({ summary: 'Start Jargon Master — BPO vocabulary quiz' })
  startJargonMaster(@Body() dto: StartGameDto, @Req() req) {
    return this.bpoService.startJargonMaster(req.user.id, dto);
  }

  @Post('jargon-master/:sessionId/answer')
  @ApiOperation({ summary: 'Answer current jargon question' })
  answerJargonMaster(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.bpoService.answerJargonMaster(req.user.id, sessionId, dto);
  }

  // ── Stats ────────────────────────────────────────────────────
  @Get('personal-best')
  @ApiOperation({ summary: 'Personal best for all BPO games' })
  getPersonalBest(@Req() req) {
    return this.bpoService.getPersonalBest(req.user.id);
  }
}