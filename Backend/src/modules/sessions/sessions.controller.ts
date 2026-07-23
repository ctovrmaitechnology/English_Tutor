import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new user session — call on login' })
  startSession(@Request() req) {
    return this.sessionsService.startSession(req.user.id);
  }

  @Post('end')
  @ApiOperation({ summary: 'End the current session — call on logout or tab close' })
  endSession(
    @Request() req,
    @Body() body: { aiTutorDuration?: number },
  ) {
    return this.sessionsService.endSession(req.user.id, body.aiTutorDuration || 0);
  }

  @Post('ai-tutor')
  @ApiOperation({ summary: 'Update AI tutor time for current session' })
  updateAiTutorTime(
    @Request() req,
    @Body() body: { aiTutorDuration: number },
  ) {
    return this.sessionsService.updateAiTutorTime(req.user.id, body.aiTutorDuration);
  }
}