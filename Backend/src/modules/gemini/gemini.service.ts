import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Attempt {
  model: string;
  keyIndex: number;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly clients: GoogleGenerativeAI[];

  private readonly MODELS = [
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
  ];

  private serialQueue: Promise<any> = Promise.resolve();

  constructor(private config: ConfigService) {
    const keys = [
      this.config.get<string>('GOOGLE_GEMINI_API_KEY'),
      this.config.get<string>('GOOGLE_GEMINI_API_KEY_2'),
      this.config.get<string>('GOOGLE_GEMINI_API_KEY_3'),
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
      throw new Error('No Gemini API keys found in environment');
    }

    this.clients = keys.map(key => new GoogleGenerativeAI(key));

    this.logger.log(
      `Gemini ready — ${this.clients.length} key(s), ` +
      `${this.MODELS.length} models, ` +
      `${this.clients.length * this.MODELS.length} total attempts`,
    );
  }

  private buildAttempts(): Attempt[] {
    const attempts: Attempt[] = [];
    for (const model of this.MODELS) {
      for (let keyIndex = 0; keyIndex < this.clients.length; keyIndex++) {
        attempts.push({ model, keyIndex });
      }
    }
    return attempts;
  }

  // ── Plain text response ──────────────────────────────────────
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const attempts = this.buildAttempts();
    let lastError: any = null;
    let prevModel     = '';

    for (let i = 0; i < attempts.length; i++) {
      const { model, keyIndex } = attempts[i];

      if (model !== prevModel && prevModel !== '') {
        const waitMs = this.extractRetryDelay(lastError);
        this.logger.warn(
          `All keys exhausted for ${prevModel} — ` +
          `waiting ${waitMs}ms before trying ${model}`,
        );
        await this.sleep(waitMs);
      }
      prevModel = model;

      try {
        this.logger.debug(
          `Attempt ${i + 1}/${attempts.length} → ${model} (key ${keyIndex + 1})`,
        );

        const geminiModel = this.clients[keyIndex].getGenerativeModel({ model });

        const request: any = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        };

        if (systemPrompt) {
          request.systemInstruction = systemPrompt;
        }

        const result = await geminiModel.generateContent(request);
        const text   = result.response.text();

        this.logger.log(`✅ Success → ${model} (key ${keyIndex + 1})`);
        return text;

      } catch (err: any) {
        lastError = err;

        if (this.isRateLimitError(err)) {
          this.logger.warn(
            `⚠️  429 Rate limit → ${model} (key ${keyIndex + 1})`,
          );
          continue;
        }

        this.logger.error(
          `❌ Fatal error → ${model} (key ${keyIndex + 1}): ${err?.message}`,
        );
        throw err;
      }
    }

    this.logger.error('❌ All models and keys exhausted');
    throw new Error(
      'All Gemini API keys and models are rate-limited. Try again shortly.',
    );
  }

  // ── JSON response ────────────────────────────────────────────
  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const text = await this.generate(prompt, systemPrompt);
    try {
      const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch {
      this.logger.error('Failed to parse Gemini JSON:', text);
      throw new Error('AI returned invalid JSON. Please retry.');
    }
  }

  // ── Multi-turn chat ──────────────────────────────────────────
  async chat(
    messages: { role: 'user' | 'model'; text: string }[],
    systemPrompt?: string,
  ): Promise<string> {
    const attempts = this.buildAttempts();
    let lastError: any = null;
    let prevModel     = '';

    for (let i = 0; i < attempts.length; i++) {
      const { model, keyIndex } = attempts[i];

      if (model !== prevModel && prevModel !== '') {
        const waitMs = this.extractRetryDelay(lastError);
        await this.sleep(waitMs);
      }
      prevModel = model;

      try {
        const modelParams: any = { model };
        if (systemPrompt) {
          modelParams.systemInstruction = systemPrompt;
        }

        const geminiModel = this.clients[keyIndex].getGenerativeModel(modelParams);

        const history = messages.slice(0, -1).map(m => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

        const chatSession = geminiModel.startChat({ history });
        const lastMsg     = messages[messages.length - 1].text;
        const result      = await chatSession.sendMessage(lastMsg);

        this.logger.log(`✅ Chat success → ${model} (key ${keyIndex + 1})`);
        return result.response.text();

      } catch (err: any) {
        lastError = err;

        if (this.isRateLimitError(err)) {
          this.logger.warn(`⚠️  429 Chat → ${model} (key ${keyIndex + 1})`);
          continue;
        }
        throw err;
      }
    }

    throw new Error('All Gemini keys and models exhausted during chat.');
  }

  // ── Serial queue variants ────────────────────────────────────
  async generateSerial(prompt: string, systemPrompt?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.serialQueue = this.serialQueue
        .then(() => this.generate(prompt, systemPrompt))
        .then(resolve)
        .catch(reject);
    });
  }

  async generateJSONSerial<T>(
    prompt: string,
    systemPrompt?: string,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.serialQueue = this.serialQueue
        .then(() => this.generateJSON<T>(prompt, systemPrompt))
        .then(resolve)
        .catch(reject);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  private extractRetryDelay(error: any): number {
    try {
      const details = error?.errorDetails || error?.details || [];
      for (const detail of details) {
        if (detail?.retryDelay) {
          const match = String(detail.retryDelay).match(/(\d+)/);
          if (match) {
            return Math.min(parseInt(match[1], 10) * 1000, 60_000);
          }
        }
      }
    } catch {}
    return 2000;
  }

  private isRateLimitError(error: any): boolean {
    const msg = (error?.message || '').toLowerCase();
    return (
      error?.status === 429 ||
      error?.code   === 429 ||
      msg.includes('429') ||
      msg.includes('resource_exhausted') ||
      msg.includes('quota exceeded') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}