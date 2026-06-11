import {
  Controller, Post, Get,
  Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DailyService } from './daily.service';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

@ApiTags('Daily & Special Games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/daily')
export class DailyController {
  constructor(private readonly dailyService: DailyService) {}

  // ── Spin Wheel ───────────────────────────────────────────────
  @Get('spin/check')
  @ApiOperation({ summary: 'Check if daily spin is available' })
  checkSpin(@Req() req) {
    return this.dailyService.checkSpinAvailable(req.user.id);
  }

  @Post('spin')
  @ApiOperation({ summary: 'Spin the daily wheel — once per day' })
  spin(@Req() req) {
    return this.dailyService.spin(req.user.id);
  }

  @Get('spin/reward')
  @ApiOperation({ summary: "Get today's active spin reward" })
  getActiveReward(@Req() req) {
    return this.dailyService.getActiveReward(req.user.id);
  }

  // ── Boss Battle ──────────────────────────────────────────────
  @Get('boss/check')
  @ApiOperation({ summary: 'Check if this week boss battle is available' })
  checkBoss(@Req() req) {
    return this.dailyService.checkBossAvailable(req.user.id);
  }

  @Post('boss/start')
  @ApiOperation({ summary: 'Start the weekly Boss Battle' })
  startBoss(@Req() req) {
    return this.dailyService.startBossBattle(req.user.id);
  }

  @Post('boss/:sessionId/reply')
  @ApiOperation({ summary: 'Reply to the boss customer' })
  replyBoss(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @Req() req,
  ) {
    return this.dailyService.replyBossBattle(req.user.id, sessionId, dto);
  }

  // ── Streak Shield ────────────────────────────────────────────
  @Get('streak-shield')
  @ApiOperation({ summary: 'Get streak shield info and count' })
  getStreakInfo(@Req() req) {
    return this.dailyService.getStreakInfo(req.user.id);
  }

  @Post('streak-shield/use')
  @ApiOperation({ summary: 'Use a streak shield to save your streak' })
  useShield(@Req() req) {
    return this.dailyService.useStreakShield(req.user.id);
  }

  @Post('streak-shield/award')
  @ApiOperation({ summary: 'Award a streak shield (called after 7-day streak)' })
  awardShield(@Req() req) {
    return this.dailyService.awardStreakShield(req.user.id);
  }

  // ── Treasure Hunt ────────────────────────────────────────────
  @Get('treasure-hunt')
  @ApiOperation({ summary: 'Get monthly treasure hunt status' })
  getTreasureHunt(@Req() req) {
    return this.dailyService.getTreasureHuntStatus(req.user.id);
  }

  @Post('treasure-hunt/unlock/:activityType')
  @ApiOperation({ summary: 'Unlock a treasure word after completing an activity' })
  unlockWord(
    @Param('activityType') activityType: string,
    @Req() req,
  ) {
    return this.dailyService.unlockTreasureWord(req.user.id, activityType);
  }
}