import {
  Controller, Post, Delete, Get,
  Body, Req, UseGuards,
  UseInterceptors, UploadedFile,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@ApiTags('Chat Tutor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ── Send text message ────────────────────────────────────────
  @Post('message')
  @ApiOperation({ summary: 'Send text message to AI tutor' })
  sendMessage(
    @Body() body: { message: string },
    @Req() req,
  ) {
    return this.chatService.sendMessage(req.user.id, body.message);
  }

  // ── Send voice message ───────────────────────────────────────
  @Post('voice')
  @ApiOperation({ summary: 'Send voice message — returns transcript + AI response + audio' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  sendVoice(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /audio\/(wav|webm|mpeg|mp3|ogg|x-wav)/ }),
        ],
      }),
    ) file: Express.Multer.File,
    @Req() req,
  ) {
    return this.chatService.sendVoiceMessage(req.user.id, file.buffer);
  }

  // ── Get history ──────────────────────────────────────────────
  @Get('history')
  @ApiOperation({ summary: 'Get conversation history' })
  async getHistory(@Req() req) {
    const history = await this.chatService.getHistory(req.user.id);
    return { messages: history };
  }

  // ── Clear history ────────────────────────────────────────────
  @Delete('history')
  @ApiOperation({ summary: 'Clear conversation history' })
  clearHistory(@Req() req) {
    return this.chatService.clearHistory(req.user.id);
  }
}