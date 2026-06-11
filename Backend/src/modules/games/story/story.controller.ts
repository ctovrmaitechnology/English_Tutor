import {
  Controller, Post, Get,
  Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { StoryService } from './story.service';
import { StartGameDto } from '../dto/start-game.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

@ApiTags('Story & Creative Games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  // ── Story Builder ────────────────────────────────────────────
  @Post('story-builder/start')
  @ApiOperation({ summary: 'Start Story Builder — co-write with AI' })
  startStoryBuilder(@Body() dto: StartGameDto, @Req() req) {
    return this.storyService.startStoryBuilder(req.user.id, dto);
  }

  @Post('story-builder/:sessionId/continue')
  @ApiOperation({ summary: 'Add your next sentence to the story' })
  continueStoryBuilder(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.storyService.continueStoryBuilder(req.user.id, sessionId, dto);
  }

  // ── News Anchor ──────────────────────────────────────────────
  @Post('news-anchor/start')
  @ApiOperation({ summary: 'Start News Anchor — get reading script' })
  startNewsAnchor(@Body() dto: StartGameDto, @Req() req) {
    return this.storyService.startNewsAnchor(req.user.id, dto);
  }

  @Post('news-anchor/:sessionId/submit')
  @ApiOperation({ summary: 'Submit transcript after reading aloud' })
  submitNewsAnchor(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.storyService.submitNewsAnchor(req.user.id, sessionId, dto);
  }

  // ── Job Interview ────────────────────────────────────────────
  @Post('job-interview/start')
  @ApiOperation({ summary: 'Start Job Interview simulation' })
  startJobInterview(@Body() dto: StartGameDto, @Req() req) {
    return this.storyService.startJobInterview(req.user.id, dto);
  }

  @Post('job-interview/:sessionId/answer')
  @ApiOperation({ summary: 'Answer the interviewer question' })
  answerJobInterview(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.storyService.answerJobInterview(req.user.id, sessionId, dto);
  }

  // ── Debate Me ────────────────────────────────────────────────
  @Post('debate-me/start')
  @ApiOperation({ summary: 'Start Debate Me — argue against AI' })
  startDebateMe(@Body() dto: StartGameDto, @Req() req) {
    return this.storyService.startDebateMe(req.user.id, dto);
  }

  @Post('debate-me/:sessionId/argue')
  @ApiOperation({ summary: 'Submit your debate argument' })
  argueDebateMe(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.storyService.argueDebateMe(req.user.id, sessionId, dto);
  }

  // ── Stats ────────────────────────────────────────────────────
  @Get('personal-best')
  @ApiOperation({ summary: 'Personal best for all story games' })
  getPersonalBest(@Req() req) {
    return this.storyService.getPersonalBest(req.user.id);
  }
}