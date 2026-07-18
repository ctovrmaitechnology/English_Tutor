import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlacementService } from './placement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { FinishAttemptDto } from './dto/finish-attempt.dto';

@ApiTags('Placement Assessment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('placement')
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  @Post('start')
  @ApiOperation({
    summary: 'Start (or resume) the placement assessment — returns the FULL question set for local navigation',
  })
  async start(@Request() req) {
    return this.placementService.startAttempt(req.user.id);
  }

  @Post('answer')
  @ApiOperation({
    summary: 'Save a single answer in the background. Does not return the next question — the frontend already has it.',
  })
  @ApiResponse({ status: 201, description: '{ saved: true } on success. Idempotent — safe to retry.' })
  async answer(@Request() req, @Body() body: SubmitAnswerDto) {
    return this.placementService.submitAnswer(
      req.user.id,
      body.attemptId,
      body.questionId,
      body.selectedOptionIndex,
      body.responseTimeMs,
      body.textResponse,
    );
  }

  @Post('finish')
  @ApiOperation({ summary: 'Finalize the attempt and compute the placement result' })
  async finish(@Request() req, @Body() body: FinishAttemptDto) {
    return this.placementService.finishAttempt(req.user.id, body.attemptId);
  }

  @Get('my-latest-result')
  @ApiOperation({ summary: 'Fetch the most recent completed placement result for the authenticated user' })
  async myLatestResult(@Request() req) {
    return this.placementService.getMyLatestResult(req.user.id);
  }

  @Get('report/latest')
  @ApiOperation({ summary: 'Fetch detailed breakdown report of latest completed placement assessment' })
  async latestReport(@Request() req) {
    return this.placementService.getLatestReport(req.user.id);
  }

  @Get('report/:attemptId')
  @ApiOperation({ summary: 'Fetch detailed breakdown report of a specific placement assessment attempt' })
  async report(@Request() req, @Param('attemptId') attemptId: string) {
    return this.placementService.getReport(req.user.id, attemptId);
  }

  @Get('result/:attemptId')
  @ApiOperation({ summary: 'Fetch the final result of a completed placement attempt' })
  async result(@Request() req, @Param('attemptId') attemptId: string) {
    return this.placementService.getResult(req.user.id, attemptId, true);
  }
}
