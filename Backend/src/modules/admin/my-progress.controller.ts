import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MyProgressService } from './my-progress.service';

@ApiTags('My Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('my-progress')
export class MyProgressController {
  constructor(private readonly myProgressService: MyProgressService) {}

  @Get()
  @ApiOperation({ summary: 'Get logged-in user full progress dashboard data' })
  getMyProgress(@Request() req) {
    return this.myProgressService.getMyProgress(req.user.sub);
  }
}