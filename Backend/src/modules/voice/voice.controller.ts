import { Controller, Post, Body, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { VoiceService } from './voice.service';
import { ApiOperation, ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SynthesizeDto } from './dto/synthesize.dto';

@ApiTags('Voice Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('synthesize')
  @ApiOperation({ summary: 'Synthesize text to speech using local Kokoro TTS engine' })
  @ApiBody({ type: SynthesizeDto })
  async synthesize(
    @Body() body: SynthesizeDto,
    @Res() res: Response,
  ) {
    try {
      const { text, voice, speed } = body;
      const buffer = await this.voiceService.synthesize(
        text,
        voice || 'af_heart',
        speed !== undefined ? speed : 1.1,
      );

      res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length,
      });

      res.status(HttpStatus.OK).send(buffer);
    } catch (err: any) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: err.message || 'TTS synthesis failed',
      });
    }
  }
}
