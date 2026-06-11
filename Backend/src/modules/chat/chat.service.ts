import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { VoiceService } from '../voice/voice.service';

const getBuddySystemPrompt = (): string => {
  const now = new Date();

  const date = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const time = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  return `You are Buddy, a warm and friendly AI English tutor for BPO employees in India.

TODAY: ${date} | TIME: ${time} IST

Your role:
- Help improve English communication skills for customer service work
- Gently correct grammar mistakes by showing the correct version
- Teach professional BPO vocabulary and phrases
- Give pronunciation tips for common challenges
- Practice conversation scenarios
- Explain idioms and professional expressions

Guidelines:
- Be encouraging, positive and patient always
- Keep responses SHORT — 2 to 3 sentences maximum
- Use simple clear English
- When correcting grammar, say: "Great attempt! The correct way is: ___"
- Give BPO/customer service examples when possible
- If asked in Hindi or regional language, respond in simple English
- Always use today's actual date and time when asked

You are talking to a BPO trainee who wants to improve their English.
Be their supportive coach. Never make them feel embarrassed.`;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  // In-memory conversation history per user
  // In production — move to Redis
  private histories = new Map<string, { role: 'user' | 'model'; text: string }[]>();

  constructor(
    private gemini: GeminiService,
    private voice: VoiceService,
  ) {}

  // ── Text message ─────────────────────────────────────────────
  async sendMessage(userId: string, message: string) {
    const history = this.getHistory(userId);

    // Add user message
    history.push({ role: 'user', text: message });

    // Keep last 12 messages for context
    const context = history.slice(-12);

    // Get AI response
    const aiText = await this.gemini.chat(context, getBuddySystemPrompt());

    // Add AI response to history
    history.push({ role: 'model', text: aiText });
    this.histories.set(userId, history);

    // Generate TTS audio
    let audioBase64: string | null = null;
    try {
      const audioBuffer = await this.voice.synthesize(aiText, 'af_sarah', 1.1);
      audioBase64 = audioBuffer.toString('base64');
    } catch (err) {
      this.logger.warn('TTS unavailable — text only response');
    }

    return { text: aiText, audioBase64 };
  }

  // ── Voice message ────────────────────────────────────────────
  async sendVoiceMessage(userId: string, audioBuffer: Buffer) {
    // Step 1: Transcribe user's speech
    let transcript = '';
    try {
      transcript = await this.voice.transcribe(audioBuffer);
    } catch {
      transcript = 'I could not understand that. Please try again.';
    }

    // Step 2: Get AI response (same as text)
    const response = await this.sendMessage(userId, transcript);

    return {
      userText: transcript,
      aiText: response.text,
      audioBase64: response.audioBase64,
    };
  }

  // ── Get chat history ─────────────────────────────────────────
  getHistory(userId: string) {
    if (!this.histories.has(userId)) {
      this.histories.set(userId, []);
    }
    return this.histories.get(userId)!;
  }

  // ── Clear history ────────────────────────────────────────────
  clearHistory(userId: string) {
    this.histories.delete(userId);
    return { message: 'Conversation cleared!' };
  }
}