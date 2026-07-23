import { Controller, Get, Post, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CandidateRemarkService } from './candidate-remark.service';

@ApiTags('Candidate Remarks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('remarks')
export class CandidateRemarkController {
  private readonly logger = new Logger(CandidateRemarkController.name);

  constructor(private readonly remarkService: CandidateRemarkService) {}

  // GET /remarks/me — get current user's latest remark
  @Get('me')
  @ApiOperation({ summary: 'Get the current user\'s latest learning remark' })
  getMyRemark(@Request() req) {
    return this.remarkService.getUserRemark(req.user.id);
  }

  // GET /remarks/me/context — get remark formatted as AI system prompt context
  @Get('me/context')
  @ApiOperation({ summary: 'Get remark as AI system prompt context string' })
  async getMyRemarkContext(@Request() req) {
    const context = await this.remarkService.getRemarkAsContext(req.user.id);
    return { context };
  }

  // POST /remarks/me/generate — manually trigger remark generation for current user
  @Post('me/generate')
  @ApiOperation({ summary: 'Manually trigger remark generation for the current user (for testing or first-time)' })
  async generateMyRemark(@Request() req) {
    this.logger.log(`Remark generation triggered for user ${req.user.id}`);
    const remark = await this.remarkService.generateRemarkForUser(req.user.id);
    return remark || { message: 'Remark generation failed. Check backend logs.' };
  }

  // POST /remarks/me/first — called automatically after entry test completion
  @Post('me/first')
  @ApiOperation({ summary: 'Generate first remark immediately after entry test is completed' })
  async generateFirstRemark(@Request() req) {
    this.logger.log(`First remark generation after entry test for user ${req.user.id}`);
    const existing = await this.remarkService.getUserRemark(req.user.id);
    // Only generate if no remark exists yet
    if (!existing) {
      const remark = await this.remarkService.generateRemarkForUser(req.user.id);
      return remark || { message: 'First remark generation failed.' };
    }
    return existing;
  }
}