import {
  Controller, Get,
  Query, Req, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  ApiTags, ApiBearerAuth,
  ApiOperation, ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GamesService } from './games.service';

@ApiTags('Games Overview')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  // ── All categories + game list ───────────────────────────────
  @Get('categories')
  @ApiOperation({ summary: 'Get all game categories and their games' })
  getCategories() {
    return this.gamesService.getCategories();
  }

  // ── Full game history ────────────────────────────────────────
  @Get('history')
  @ApiOperation({ summary: 'Get full game history across all categories' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getHistory(
    @Req() req,
    @Query('limit') limit?: number,
  ) {
    return this.gamesService.getFullHistory(req.user.id, limit || 20);
  }

  // ── Overall stats ────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get overall game stats — XP, accuracy, favourite category' })
  getStats(@Req() req) {
    return this.gamesService.getOverallStats(req.user.id);
  }

  // ── All personal bests ───────────────────────────────────────
  @Get('personal-bests')
  @ApiOperation({ summary: 'Get personal best scores for all 24 games' })
  getAllPersonalBests(@Req() req) {
    return this.gamesService.getAllPersonalBests(req.user.id);
  }

  // ── Recent activity ──────────────────────────────────────────
  @Get('recent-activity')
  @ApiOperation({ summary: 'Get last 5 game sessions across all categories' })
  getRecentActivity(@Req() req) {
    return this.gamesService.getRecentActivity(req.user.id);
  }

  // ── Weekly leaderboard ───────────────────────────────────────
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  @Get('leaderboard')
  @ApiOperation({
    summary: 'Get weekly XP leaderboard (top 10). Note: Cached for 60s (eventual consistency; recent XP updates take up to 60s to appear).',
  })
  getLeaderboard() {
    return this.gamesService.getWeeklyLeaderboard();
  }
}