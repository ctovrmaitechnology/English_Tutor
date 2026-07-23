import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { VoiceService } from '../voice/voice.service';

// ── Buddy System Prompt (General Learning Companion) ──────────
const getBuddySystemPrompt = (): string => {
  const now = new Date();
  const date = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

  return `You are Buddy, a warm, friendly, and supportive AI English learning companion.

TODAY: ${date} | TIME: ${time} IST

Your role:
* Help users improve their English naturally through conversation.
* Understand messages written in any language and always reply in English.
* Act like a friendly mentor and English conversational coach.
* Correct grammar mistakes gently and positively.
* Teach vocabulary, pronunciation, sentence formation, and communication skills.
* Build confidence in speaking and writing English.

Guidelines:
* Always respond in simple, natural English.
* Always format your entire response point-by-point using bullet points (*). Do NOT write paragraphs.
* Each bullet point must start on a new line.
* Be friendly, patient, and encouraging.
* Keep responses short and easy to understand.
* Never criticize or embarrass the user.
* If the user makes a mistake:
  * First encourage them: "Well tried!"
  * Then say: "A more natural way to say it is: ___"
  * Briefly explain the correction.
* Praise effort before giving corrections.
* If the user writes in Tamil, Hindi, Telugu, or any other language, understand the meaning and reply in English.

Examples:
User: "I going to college everyday."
Buddy:
* Well tried!
* A more natural way to say it is: "I go to college every day."
* We use "go" for a regular daily activity.
* What subject do you enjoy the most?

User: "எனக்கு English பேச பயம்."
Buddy:
* Well tried!
* In English, you can say: "I am afraid to speak English."
* Many learners feel this way at first.
* You're improving every time you practice.
* Can you tell me about your day in English?`;
};

// ── AI Tutor System Prompt (Dedicated BPO Lesson & Workplace Coach) ──
const getAITutorSystemPrompt = (topic?: string): string => {
  const now = new Date();
  const date = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });

  const topicRule = topic 
    ? `* STRICT TOPIC BOUNDARY: The current active lesson topic is "${topic}". Stay 100% focused EXCLUSIVELY on "${topic}". Do NOT diverge to unrelated topics.`
    : `* STRICT TOPIC BOUNDARY: Stay 100% focused EXCLUSIVELY on the current lesson topic specified in the conversation.`;

  return `You are VRM AI Tutor, an expert BPO Call Center & Professional Workplace Communication Coach.

TODAY: ${date} IST

STRICT LESSON & WORKPLACE COACHING BOUNDARY:
${topicRule}
* Focus 100% EXCLUSIVELY on professional BPO call handling and workplace skills for this lesson.
* Guide the candidate through interactive customer call roleplays and practical workplace drills.
* Teach professional greetings, active listening, empathy phrasing, objection handling, and call closing techniques.
* Correct workplace grammar, tone, and pronunciation mistakes constructively.

STRICT GUARDRAILS:
* NEVER output internal developer thoughts, notes about missing data, bracketed text like [Here, I would insert...], or code snippets.
* NEVER dump numerical test scores, percentages, or grade mark calculations.
* Always keep your responses punchy, conversational, professional, and encouraging.
* End every response with a quick, interactive BPO scenario or practice question for the student to answer.`;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  // Separate in-memory conversation histories per user and mode (userId:buddy vs userId:tutor)
  private histories = new Map<string, { role: 'user' | 'model'; text: string }[]>();
  private activeLessonTopics = new Map<string, string>(); // userId -> current active lesson topic

  constructor(
    private gemini: GeminiService,
    private voice: VoiceService,
  ) {}

  // ── Text message ─────────────────────────────────────────────
  async sendMessage(userId: string, message: string, remarkContext?: string, mode: 'buddy' | 'tutor' = 'buddy') {
    const memoryKey = `${userId}:${mode}`;

    // Detect lesson topic in remarkContext to purge old tutor history on lesson switch
    const topicMatch = remarkContext?.match(/lesson titled "([^"]+)"/i) || remarkContext?.match(/topic "([^"]+)"/i);
    const currentTopic = topicMatch ? topicMatch[1] : null;

    if (mode === 'tutor' && currentTopic) {
      const prevTopic = this.activeLessonTopics.get(userId);
      if (prevTopic && prevTopic.toLowerCase() !== currentTopic.toLowerCase()) {
        this.logger.log(`User ${userId} switched AI Tutor topic from "${prevTopic}" to "${currentTopic}". Purging previous tutor memory.`);
        this.histories.delete(memoryKey);
      }
      this.activeLessonTopics.set(userId, currentTopic);
    }

    const history = this.getHistory(userId, mode);

    // Add user message
    history.push({ role: 'user', text: message });

    // Keep last 12 messages for context window
    const context = history.slice(-12);

    // Pick distinct system prompt based on mode (Buddy vs AI Tutor)
    const activeTopic = this.activeLessonTopics.get(userId);
    const basePrompt = mode === 'tutor' ? getAITutorSystemPrompt(activeTopic) : getBuddySystemPrompt();
    const systemPrompt = remarkContext
      ? `${basePrompt}\n\n${remarkContext}`
      : basePrompt;

    // Get AI response
    const aiText = await this.gemini.chat(context, systemPrompt);

    // Add AI response to history
    history.push({ role: 'model', text: aiText });
    this.histories.set(memoryKey, history);

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
  async sendVoiceMessage(userId: string, audioBuffer: Buffer, mode: 'buddy' | 'tutor' = 'buddy') {
    // Step 1: Transcribe user's speech
    let transcript = '';
    try {
      transcript = await this.voice.transcribe(audioBuffer);
    } catch {
      transcript = 'I could not understand that. Please try again.';
    }

    // Step 2: Get AI response with specified mode memory
    const response = await this.sendMessage(userId, transcript, undefined, mode);

    return {
      userText: transcript,
      aiText: response.text,
      audioBase64: response.audioBase64,
    };
  }

  // ── Get chat history ─────────────────────────────────────────
  getHistory(userId: string, mode: 'buddy' | 'tutor' = 'buddy') {
    const memoryKey = `${userId}:${mode}`;
    if (!this.histories.has(memoryKey)) {
      this.histories.set(memoryKey, []);
    }
    return this.histories.get(memoryKey)!;
  }

  // ── Clear history ────────────────────────────────────────────
  clearHistory(userId: string, mode?: 'buddy' | 'tutor') {
    if (mode) {
      const memoryKey = `${userId}:${mode}`;
      this.histories.delete(memoryKey);
      if (mode === 'tutor') this.activeLessonTopics.delete(userId);
    } else {
      this.histories.delete(`${userId}:buddy`);
      this.histories.delete(`${userId}:tutor`);
      this.activeLessonTopics.delete(userId);
    }
    return { message: 'Conversation cleared!' };
  }
}