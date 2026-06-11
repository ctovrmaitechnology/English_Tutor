import {
  Controller, Post, Get,
  Param, Body, Req, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { VoiceGamesService } from './voice-games.service';
import { StartGameDto } from '../dto/start-game.dto';

// Custom file interface — avoids Express.Multer.File dependency
interface UploadedAudioFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('Voice & Pronunciation Games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/voice')
export class VoiceGamesController {
  constructor(private readonly voiceGamesService: VoiceGamesService) {}

  // ── Tongue Twister ───────────────────────────────────────────
  @Post('tongue-twister/start')
  @ApiOperation({ summary: 'Start Tongue Twister — returns text + AI audio' })
  startTongueTwister(@Body() dto: StartGameDto, @Req() req) {
    return this.voiceGamesService.startTongueTwister(req.user.id, dto);
  }

  @Post('tongue-twister/:sessionId/submit')
  @ApiOperation({ summary: 'Submit audio recording of tongue twister' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  submitTongueTwister(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: UploadedAudioFile,
    @Req() req,
  ) {
    return this.voiceGamesService.submitTongueTwister(
      req.user.id,
      sessionId,
      file.buffer,
    );
  }

  // ── Echo Master ──────────────────────────────────────────────
  @Post('echo-master/start')
  @ApiOperation({ summary: 'Start Echo Master — listen and repeat' })
  startEchoMaster(@Body() dto: StartGameDto, @Req() req) {
    return this.voiceGamesService.startEchoMaster(req.user.id, dto);
  }

  @Post('echo-master/:sessionId/submit')
  @ApiOperation({ summary: 'Submit your echo recording' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  submitEchoMaster(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: UploadedAudioFile,
    @Req() req,
  ) {
    return this.voiceGamesService.submitEchoMaster(
      req.user.id,
      sessionId,
      file.buffer,
    );
  }

  // ── Accent Drill ─────────────────────────────────────────────
  @Post('accent-drill/start')
  @ApiOperation({ summary: 'Start Accent Drill — targeted MTI exercises' })
  startAccentDrill(@Body() dto: StartGameDto, @Req() req) {
    return this.voiceGamesService.startAccentDrill(req.user.id, dto);
  }

  @Post('accent-drill/:sessionId/submit')
  @ApiOperation({ summary: 'Submit accent drill audio' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  submitAccentDrill(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: UploadedAudioFile,
    @Req() req,
  ) {
    return this.voiceGamesService.submitAccentDrill(
      req.user.id,
      sessionId,
      file.buffer,
    );
  }

  // ── Speed Speak ──────────────────────────────────────────────
  @Post('speed-speak/start')
  @ApiOperation({ summary: 'Start Speed Speak — say as many words as possible' })
  startSpeedSpeak(@Body() dto: StartGameDto, @Req() req) {
    return this.voiceGamesService.startSpeedSpeak(req.user.id, dto);
  }

  @Post('speed-speak/:sessionId/submit')
  @ApiOperation({ summary: 'Submit 30-second audio recording' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  submitSpeedSpeak(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: UploadedAudioFile,
    @Req() req,
  ) {
    return this.voiceGamesService.submitSpeedSpeak(
      req.user.id,
      sessionId,
      file.buffer,
    );
  }

  // ── Stats ────────────────────────────────────────────────────
  @Get('personal-best')
  @ApiOperation({ summary: 'Personal best for all voice games' })
  getPersonalBest(@Req() req) {
    return this.voiceGamesService.getPersonalBest(req.user.id);
  }
}