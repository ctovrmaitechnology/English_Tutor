import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { VoiceService } from './voice.service';
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Voice Service')
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('synthesize')
  @ApiOperation({ summary: 'Synthesize text to speech using local Kokoro TTS engine' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'Hello, welcome to customer support.' },
        voice: { type: 'string', example: 'af_heart', default: 'af_heart' },
        speed: { type: 'number', example: 1.1, default: 1.1 },
      },
      required: ['text'],
    },
  })
  async synthesize(
    @Body() body: { text: string; voice?: string; speed?: number },
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
