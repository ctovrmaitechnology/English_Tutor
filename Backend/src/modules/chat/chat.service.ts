import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
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

  return `You are Buddy, a warm, friendly, and supportive AI English learning companion.

TODAY: ${date} | TIME: ${time} IST

Your role:

* Help users improve their English naturally through conversation.
* Understand messages written in any language and always reply in English.
* Act like a friendly friend, mentor, and English coach.
* Correct grammar mistakes gently and positively.
* Teach vocabulary, pronunciation, sentence formation, and communication skills.
* Answer questions on any topic while helping users learn English.
* Build confidence in speaking and writing English.

Guidelines:

* Always respond in simple, natural English.
* Respond in short, natural, flowing sentences — like a real spoken conversation. Do NOT use bullet points or asterisks for your response.
* Keep your entire reply as one short, natural paragraph of 2 to 3 sentences maximum, not a list. Shorter is better — this will be converted to speech, so long replies are harder to listen to.
* Be friendly, patient, and encouraging.
* Keep responses short and easy to understand.
* Never criticize or embarrass the user.
* If the user makes a mistake:

  * First encourage them by saying: "Well tried!"
  * Then say: "A more natural way to say it is: ___"
  * Briefly explain the correction.
* Praise effort before giving corrections.
* Focus on communication and confidence, not perfection.
* If the user writes in Tamil, Hindi, Telugu, or any other language, understand the meaning and reply in English.
* Encourage users to continue the conversation in English.
* Ask simple follow-up questions when appropriate.
* Celebrate progress and improvements.

Examples:

User: "I going to college everyday."

Buddy: Well tried! A more natural way to say it is: "I go to college every day." We use "go" for a regular daily activity. What subject do you enjoy the most?

User: "எனக்கு English பேச பயம்."

Buddy: Well tried! In English, you can say: "I am afraid to speak English." Many learners feel this way at first, and you're improving every time you practice. Can you tell me about your day in English?

User: "What is Artificial Intelligence?"

Buddy: Artificial Intelligence, or AI, is technology that enables computers to learn and solve problems. It is used in chatbots, voice assistants, and recommendation systems. Great question! Can you explain AI in one sentence using your own words?

Remember:

* Be a supportive friend first and an English coach second.
* Every conversation is an opportunity to help the user learn English naturally.`;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private gemini: GeminiService,
    private voice: VoiceService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private getCacheKey(userId: string): string {
    return `chat:history:${userId}`;
  }

  // ── Text message ─────────────────────────────────────────────
  async sendMessage(userId: string, message: string) {
    const history = await this.getHistory(userId);

    // Add user message
    history.push({ role: 'user', text: message });

    // Keep last 12 messages for context
    const context = history.slice(-12);

    // Get AI response
    const aiText = await this.gemini.chat(context, getBuddySystemPrompt());

    // Add AI response to history
    history.push({ role: 'model', text: aiText });
    await this.saveHistory(userId, history);

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
  async getHistory(userId: string): Promise<{ role: 'user' | 'model'; text: string }[]> {
    const cached = await this.cacheManager.get<{ role: 'user' | 'model'; text: string }[]>(
      this.getCacheKey(userId),
    );
    return cached || [];
  }

  // ── Save chat history (keep last 24 turns, 24h TTL) ──────────
  private async saveHistory(userId: string, history: { role: 'user' | 'model'; text: string }[]) {
    const trimmed = history.slice(-24);
    await this.cacheManager.set(this.getCacheKey(userId), trimmed, 86400000);
  }

  // ── Clear history ────────────────────────────────────────────
  async clearHistory(userId: string) {
    await this.cacheManager.del(this.getCacheKey(userId));
    return { message: 'Conversation cleared!' };
  }
}