import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData = require('form-data');

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly sttUrl: string;
  private readonly ttsUrl: string;

  constructor(private config: ConfigService) {
    this.sttUrl = this.config.get<string>('STT_SERVICE_URL', 'http://localhost:5001');
    this.ttsUrl = this.config.get<string>('TTS_SERVICE_URL', 'http://localhost:5002');
  }

  // ── Speech to Text ──────────────────────────────────────────
  async transcribe(audioBuffer: Buffer, filename = 'audio.wav'): Promise<string> {
    try {
      const form = new FormData();
      form.append('audio', audioBuffer, {
        filename,
        contentType: 'audio/wav',
      });

      const response = await axios.post(`${this.sttUrl}/transcribe`, form, {
        headers: form.getHeaders(),
        timeout: 60000,
      });

      return response.data.transcript as string;
    } catch (err: any) {
      this.logger.error('STT transcription failed:', err?.message);
      throw new Error('Speech-to-text service unavailable. Please try again.');
    }
  }

  // ── Text to Speech ──────────────────────────────────────────
  async synthesize(
    text: string,
    voice = 'af_heart',
    speed = 1.1,       // ← natural conversational speed
  ): Promise<Buffer> {
    const attempt = async (): Promise<Buffer> => {
      const response = await axios.post(
        `${this.ttsUrl}/synthesize`,
        { text, voice, speed },
        { responseType: 'arraybuffer', timeout: 90000 },
      );
      return Buffer.from(response.data);
    };

    try {
      return await attempt();
    } catch (err: any) {
      this.logger.warn(`TTS synthesis attempt 1 failed (text length ${text?.length}): ${err?.message}`);
      // Retry once — handles transient overload on the Python TTS service
      try {
        return await attempt();
      } catch (err2: any) {
        this.logger.error(`TTS synthesis failed after retry (text length ${text?.length}):`, err2?.message);
        throw new Error('Text-to-speech service unavailable. Please try again.');
      }
    }
  }

  // ── Health checks ────────────────────────────────────────────
  async checkSTTHealth(): Promise<boolean> {
    try {
      await axios.get(`${this.sttUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async checkTTSHealth(): Promise<boolean> {
    try {
      await axios.get(`${this.ttsUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}