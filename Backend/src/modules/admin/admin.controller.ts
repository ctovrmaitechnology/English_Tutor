import {
  Controller, Get, Post, Patch, Body, Param, Res,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Overview ──────────────────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview — total users, logins, monthly usage, skill trend' })
  getOverview() {
    return this.adminService.getOverviewStats();
  }

  // ── User Activity ─────────────────────────────────────────────────────────

  @Get('users/activity')
  @ApiOperation({ summary: 'All users with usage hours, AI tutor mins, avg session length, streak, last login' })
  getUserActivity() {
    return this.adminService.getUserActivity();
  }

  @Get('users')
  @ApiOperation({ summary: 'Lightweight list of all users for dropdowns/selects' })
  listUsers() {
    return this.adminService.listUsers();
  }

  // FIX 9: Session history per user
  @Get('users/:userId/sessions')
  @ApiOperation({ summary: 'Full session history for a specific user — games, speaking, modules' })
  getUserSessionHistory(@Param('userId') userId: string) {
    return this.adminService.getUserSessionHistory(userId);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new learner account with batch and role assignment' })
  createUser(
    @Body() body: {
      firstName: string; lastName: string; email: string; username: string;
      password: string; phone?: string; character?: string;
      batch?: string; role?: string; isActive?: boolean;
    },
  ) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:userId/status')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  toggleUserStatus(
    @Param('userId') userId: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.toggleUserStatus(userId, body.isActive);
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Update user details — batch, role, name, phone' })
  updateUser(
    @Param('userId') userId: string,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      batch?: string;
      role?: string;
      phone?: string;
      isActive?: boolean;
    },
  ) {
    return this.adminService.updateUser(userId, body);
  }

  // ── Learning Progress ─────────────────────────────────────────────────────

  @Get('learning/progress')
  @ApiOperation({ summary: 'Module completion, per-user progress bars, certification status' })
  getLearningProgress() {
    return this.adminService.getLearningProgress();
  }

  // ── Assessment Analytics ──────────────────────────────────────────────────

  @Get('assessment/analytics')
  @ApiOperation({ summary: 'Entry vs module vs weekly scores (based on modules studied this week), skill trends, individual reports' })
  getAssessmentAnalytics() {
    return this.adminService.getAssessmentAnalytics();
  }

  // ── Organisation Reports ──────────────────────────────────────────────────

  @Get('org/reports')
  @ApiOperation({ summary: 'Completion rates, batch-wise adoption, batch-wise summary, feature usage' })
  getOrgReports() {
    return this.adminService.getOrgReports();
  }

  // ── PowerBI KPIs ──────────────────────────────────────────────────────────

  @Get('powerbi/kpis')
  @ApiOperation({ summary: 'Executive KPIs — ROI, adoption, completion rate, certificates, AI usage, batch reports' })
  getPowerBiKpis() {
    return this.adminService.getPowerBiKpis();
  }

  // FIX 57: Export CSV report
  @Get('reports/export')
  @ApiOperation({ summary: 'Export full user activity report as a downloadable CSV file' })
  async exportReport(@Res() res: Response) {
    const csv = await this.adminService.exportReportCsv();
    const filename = `aiBuddy_report_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ── Full User Detail — modules, sub-modules, assessments, certificates ────
  @Get('users/:userId/detail')
  @ApiOperation({ summary: 'Full user detail — modules, sub-modules, scores, certificates for admin view' })
  getUserFullDetail(@Param('userId') userId: string) {
    return this.adminService.getUserFullDetail(userId);
  }
}