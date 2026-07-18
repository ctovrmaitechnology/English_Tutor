import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiService } from '../gemini/gemini.service';
import { VoiceService } from '../voice/voice.service';
import { AssessmentAttempt } from './entities/assessment-attempt.entity';
import { AssessmentQuestion } from './entities/assessment-question.entity';
import { SpeakingSession } from './entities/speaking-session.entity';

// ─── Shared types ─────────────────────────────────────────────────────────────

interface IntermediateScenario {
  id: string;           // e.g. 'sp-2-1'
  title: string;
  context: string;      // situation description shown to user
  firstMessage: string; // AI customer's opening line (also synthesised to audio)
  tip: string;
}

interface AdvancedTopic {
  id: string;
  title: string;
  situation: string;    // full situation paragraph
  firstMessage: string; // AI opening challenge line
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SpeakingAssessmentService {
  private readonly logger = new Logger(SpeakingAssessmentService.name);

  // Pass threshold per level
  private readonly PASS_THRESHOLD = {
    BEGINNER: 85,
    INTERMEDIATE: 80,
    ADVANCED: 75,
  } as const;

  // Similarity threshold for a single beginner passage to count as "correct"
  private readonly PASSAGE_PASS_SCORE = 70;

  constructor(
    @InjectRepository(SpeakingSession)
    private readonly sessionRepo: Repository<SpeakingSession>,

    @InjectRepository(AssessmentQuestion)
    private readonly questionRepo: Repository<AssessmentQuestion>,

    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepo: Repository<AssessmentAttempt>,

    private readonly gemini: GeminiService,
    private readonly voice: VoiceService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ██████████  BEGINNER  ██████████
  // Format : 5 read-aloud passages → Whisper STT → F1 similarity → score
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /assessment/speaking/beginner/start
   * Returns 5 passages + creates a session to track per-passage progress.
   */
  async beginnerStart(userId: string) {
    // Fetch 5 unseen BEGINNER speaking passages
    const passages = await this._pickPassages(userId, 5);

    const session = this.sessionRepo.create({
      userId,
      level: 'BEGINNER',
      gameData: {
        passages: passages.map(p => ({
          questionId: p.id,
          passage: p.questionText,
          tip: p.explanation,
          transcript: null,
          similarityScore: null,
          passed: null,
        })),
        currentIndex: 0,
      },
    });

    const saved = await this.sessionRepo.save(session);

    const gd = saved.gameData as any;
    const first = gd.passages[0];

    return {
      sessionId: saved.id,
      totalPassages: passages.length,
      currentPassage: {
        index: 0,
        questionId: first.questionId,
        passage: first.passage,
        tip: first.tip,
      },
      instructions:
        'Read the passage aloud clearly. Press record, read, then submit your audio.',
    };
  }

  /**
   * POST /assessment/speaking/beginner/:sessionId/submit  (multipart: audio)
   * Transcribes audio, scores similarity, advances to next passage.
   * When all 5 are done → finalises and saves an AssessmentAttempt.
   */
  async beginnerSubmit(
    userId: string,
    sessionId: string,
    audioBuffer: Buffer,
    filename = 'audio.wav',
  ) {
    const session = await this._getActiveSession(userId, sessionId, 'BEGINNER');
    const gd = session.gameData as any;

    const idx = gd.currentIndex as number;
    const current = gd.passages[idx];

    // 1 ── STT
    const transcript = await this._transcribe(audioBuffer, filename);

    // 2 ── Similarity
    const similarityScore = computeF1Similarity(current.passage, transcript);
    const passed = similarityScore >= this.PASSAGE_PASS_SCORE;

    // 3 ── Persist result on this passage
    gd.passages[idx] = {
      ...current,
      transcript,
      similarityScore,
      passed,
      feedback: buildBeginnerFeedback(similarityScore, current.tip, current.passage, transcript),
    };

    gd.currentIndex = idx + 1;
    const isLast = gd.currentIndex >= gd.passages.length;

    if (!isLast) {
      await this.sessionRepo.update(sessionId, { gameData: gd });

      const next = gd.passages[gd.currentIndex];
      return {
        done: false,
        justScored: {
          passage: current.passage,
          transcript,
          similarityScore,
          passed,
          feedback: gd.passages[idx].feedback,
        },
        nextPassage: {
          index: gd.currentIndex,
          questionId: next.questionId,
          passage: next.passage,
          tip: next.tip,
        },
      };
    }

    // ── All passages done — finalise ──────────────────────────────────────────
    const correctCount = gd.passages.filter((p: any) => p.passed).length;
    const percentage = Math.round((correctCount / gd.passages.length) * 100);
    const overallPassed = percentage >= this.PASS_THRESHOLD.BEGINNER;
    const finalScore = percentage;

    await this.sessionRepo.update(sessionId, {
      completed: true,
      finalScore,
      passed: overallPassed,
      completedAt: new Date(),
      gameData: gd,
    });

    // Save to AssessmentAttempt (feeds into getStatus / getProgress)
    await this._saveAttempt(
      userId,
      'speaking',
      'BEGINNER',
      correctCount,
      gd.passages.length,
      overallPassed,
      gd.passages.map((p: any) => ({
        questionId: p.questionId,
        selectedOption: p.similarityScore ?? 0,
        isCorrect: !!p.passed,
      })),
    );

    return {
      done: true,
      justScored: {
        passage: current.passage,
        transcript,
        similarityScore,
        passed,
        feedback: gd.passages[idx].feedback,
      },
      result: {
        score: correctCount,
        totalQuestions: gd.passages.length,
        totalPassages: gd.passages.length,
        percentage,
        passed: overallPassed,
        requiredPercentage: this.PASS_THRESHOLD.BEGINNER,
        details: gd.passages.map((p: any) => ({
          questionId: p.questionId,
          questionText: p.passage,
          selectedOption: p.similarityScore ?? 0,
          correctOption: 70,
          isCorrect: !!p.passed,
          explanation: p.feedback,
          transcript: p.transcript,
        })),
        passageBreakdown: gd.passages.map((p: any) => ({
          passage: p.passage,
          transcript: p.transcript,
          similarityScore: p.similarityScore,
          passed: p.passed,
          feedback: p.feedback,
        })),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██████████  INTERMEDIATE  ██████████
  // Format : 5 scenarios × 3 turns each
  //   AI speaks first (TTS audio returned) → user replies by voice → Gemini scores
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /assessment/speaking/intermediate/start
   * Generates 5 BPO scenarios with Gemini, synthesises AI's first line,
   * returns first scenario + audio.
   */
  async intermediateStart(userId: string) {
    // Generate 5 fresh scenarios
    const scenarios = await this._generateIntermediateScenarios();

    const first = scenarios[0];
    const audioBuffer = await this.voice.synthesize(first.firstMessage, 'af_heart', 1.0);

    const session = this.sessionRepo.create({
      userId,
      level: 'INTERMEDIATE',
      gameData: {
        scenarios,
        currentScenario: 0,
        currentTurn: 0,       // turn within the current scenario (max 3)
        maxTurns: 3,
        turns: [],            // flat log of all turns
        scenarioScores: [],   // one entry per completed scenario
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      totalScenarios: scenarios.length,
      maxTurnsPerScenario: 3,
      currentScenario: {
        index: 0,
        title: first.title,
        context: first.context,
        tip: first.tip,
        aiMessage: first.firstMessage,
        aiAudioBase64: audioBuffer.toString('base64'),
      },
      instructions:
        'Listen to the AI customer, then respond professionally by voice. You have 3 exchanges per scenario.',
    };
  }

  /**
   * POST /assessment/speaking/intermediate/:sessionId/reply  (multipart: audio)
   * User replies to the AI → STT → Gemini scores turn → AI replies back (if turns remain).
   * After 3 turns the scenario closes; after 5 scenarios finalises the attempt.
   */
  async intermediateReply(
    userId: string,
    sessionId: string,
    audioBuffer: Buffer,
    filename = 'audio.wav',
  ) {
    const session = await this._getActiveSession(userId, sessionId, 'INTERMEDIATE');
    const gd = session.gameData as any;

    const scenarioIdx: number = gd.currentScenario;
    const turnIdx: number = gd.currentTurn;
    const scenario: IntermediateScenario = gd.scenarios[scenarioIdx];

    // 1 ── STT
    const transcript = await this._transcribe(audioBuffer, filename);

    // 2 ── Score this turn with Gemini
    const evaluation = await this.gemini.generateJSON<{
      clarity: number;
      empathy: number;
      professionalism: number;
      resolution: number;
      fillerPenalty: number;
      overallScore: number;
      fillerWords: string[];
      feedback: string;
      aiReply: string;    // AI customer's next line (for subsequent turns)
    }>(
      `You are scoring a BPO customer service call simulation.

Scenario: "${scenario.title}"
Context: "${scenario.context}"
Turn number: ${turnIdx + 1} of ${gd.maxTurns}
Full conversation so far:
${this._formatTurnHistory(gd.turns, scenarioIdx)}
Agent's latest response (from speech-to-text): "${transcript}"

Score the agent's response on these 5 criteria, each 0–20:
- clarity      : diction, pace, no mumbling
- empathy      : acknowledges the customer's feeling
- professionalism : proper BPO language, polite, no slang
- resolution   : offered a concrete action or next step
- fillerPenalty: SUBTRACT points for filler words (uh, um, like, you know) — 0 = many fillers, 20 = none

Also write:
- fillerWords  : list of detected filler words (empty array if none)
- feedback     : one specific coaching sentence (max 20 words)
- aiReply      : the AI customer's short realistic next line (continue the scenario naturally)

Return JSON only:
{
  "clarity": 0-20,
  "empathy": 0-20,
  "professionalism": 0-20,
  "resolution": 0-20,
  "fillerPenalty": 0-20,
  "overallScore": 0-100,
  "fillerWords": [],
  "feedback": "...",
  "aiReply": "..."
}`,
    );

    // 3 ── Log turn
    const turnRecord = {
      scenarioIdx,
      turnIdx,
      transcript,
      evaluation,
    };
    gd.turns.push(turnRecord);
    gd.currentTurn = turnIdx + 1;

    const scenarioDone = gd.currentTurn >= gd.maxTurns;

    // ── Scenario done ─────────────────────────────────────────────────────────
    if (scenarioDone) {
      // Average the turns for this scenario
      const scenarioTurns = gd.turns.filter((t: any) => t.scenarioIdx === scenarioIdx);
      const avgScore = Math.round(
        scenarioTurns.reduce((s: number, t: any) => s + t.evaluation.overallScore, 0) /
        scenarioTurns.length,
      );
      gd.scenarioScores.push({ scenarioIdx, title: scenario.title, avgScore });

      const allScenariosComplete = scenarioIdx + 1 >= gd.scenarios.length;

      if (allScenariosComplete) {
        // ── FINAL result ──────────────────────────────────────────────────────
        const finalScore = Math.round(
          gd.scenarioScores.reduce((s: number, sc: any) => s + sc.avgScore, 0) /
          gd.scenarioScores.length,
        );
        const overallPassed = finalScore >= this.PASS_THRESHOLD.INTERMEDIATE;

        await this.sessionRepo.update(sessionId, {
          completed: true,
          finalScore,
          passed: overallPassed,
          completedAt: new Date(),
          gameData: gd,
        });

        await this._saveAttempt(
          userId,
          'speaking',
          'INTERMEDIATE',
          gd.scenarioScores.filter((s: any) => s.avgScore >= 70).length,
          gd.scenarios.length,
          overallPassed,
          gd.scenarioScores.map((s: any) => ({
            questionId: s.title,
            selectedOption: s.avgScore,
            isCorrect: s.avgScore >= 70,
          })),
        );

        return {
          done: true,
          scenarioDone: true,
          turnEvaluation: evaluation,
          transcript,
          result: {
            score: gd.scenarioScores.filter((s: any) => s.avgScore >= 70).length,
            totalQuestions: gd.scenarios.length,
            percentage: finalScore,
            finalScore,
            passed: overallPassed,
            requiredPercentage: this.PASS_THRESHOLD.INTERMEDIATE,
            details: gd.scenarioScores.map((s: any) => ({
              questionId: s.title,
              questionText: s.title,
              selectedOption: s.avgScore,
              correctOption: 70,
              isCorrect: s.avgScore >= 70,
              explanation: `Scenario score: ${s.avgScore}%.`,
              transcript: undefined,
            })),
            scenarioBreakdown: gd.scenarioScores,
          },
        };
      }

      // ── Move to next scenario ─────────────────────────────────────────────
      gd.currentScenario = scenarioIdx + 1;
      gd.currentTurn = 0;
      await this.sessionRepo.update(sessionId, { gameData: gd });

      const nextScenario: IntermediateScenario = gd.scenarios[gd.currentScenario];
      const nextAudio = await this.voice.synthesize(nextScenario.firstMessage, 'af_heart', 1.0);

      return {
        done: false,
        scenarioDone: true,
        turnEvaluation: evaluation,
        transcript,
        scenarioScore: avgScore,
        nextScenario: {
          index: gd.currentScenario,
          title: nextScenario.title,
          context: nextScenario.context,
          tip: nextScenario.tip,
          aiMessage: nextScenario.firstMessage,
          aiAudioBase64: nextAudio.toString('base64'),
        },
      };
    }

    // ── More turns remain in this scenario ────────────────────────────────────
    await this.sessionRepo.update(sessionId, { gameData: gd });

    const aiAudio = await this.voice.synthesize(evaluation.aiReply, 'af_heart', 1.0);

    return {
      done: false,
      scenarioDone: false,
      turnEvaluation: evaluation,
      transcript,
      nextTurn: {
        turnIndex: gd.currentTurn,
        aiMessage: evaluation.aiReply,
        aiAudioBase64: aiAudio.toString('base64'),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██████████  ADVANCED  ██████████
  // Format : 5 topics × up to 3 turns (AI pushes back twice after opening)
  //   User speaks 90 s pitch/argument → AI pushes back → user responds
  //   Gemini holistic rubric after each topic
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /assessment/speaking/advanced/start
   */
  async advancedStart(userId: string) {
    const topics = await this._generateAdvancedTopics();

    const first = topics[0];
    const audioBuffer = await this.voice.synthesize(first.firstMessage, 'af_heart', 1.0);

    const session = this.sessionRepo.create({
      userId,
      level: 'ADVANCED',
      gameData: {
        topics,
        currentTopic: 0,
        currentTurn: 0,
        maxTurns: 3,      // open pitch + 2 AI pushbacks
        turns: [],
        topicScores: [],
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      totalTopics: topics.length,
      maxTurnsPerTopic: 3,
      currentTopic: {
        index: 0,
        title: first.title,
        situation: first.situation,
        aiMessage: first.firstMessage,
        aiAudioBase64: audioBuffer.toString('base64'),
      },
      instructions:
        'Listen to the situation, then respond freely. Speak for up to 90 seconds. The AI will push back — stay professional and persuasive.',
    };
  }

  /**
   * POST /assessment/speaking/advanced/:sessionId/reply  (multipart: audio)
   */
  async advancedReply(
    userId: string,
    sessionId: string,
    audioBuffer: Buffer,
    filename = 'audio.wav',
  ) {
    const session = await this._getActiveSession(userId, sessionId, 'ADVANCED');
    const gd = session.gameData as any;

    const topicIdx: number = gd.currentTopic;
    const turnIdx: number = gd.currentTurn;
    const topic: AdvancedTopic = gd.topics[topicIdx];

    // 1 ── STT
    const transcript = await this._transcribe(audioBuffer, filename);

    // 2 ── After every turn, get AI pushback AND (on final turn) a holistic score
    const isFinalTurn = turnIdx + 1 >= gd.maxTurns;

    const evaluation = await this.gemini.generateJSON<{
      fluency: number;
      persuasion: number;
      vocabulary: number;
      empathy: number;
      structure: number;
      overallScore: number;
      strengths: string[];
      improvements: string[];
      aiReply: string;        // AI pushback (empty string on final turn)
    }>(
      `You are evaluating an Advanced BPO English speaking assessment.

Topic: "${topic.title}"
Situation: "${topic.situation}"
Turn: ${turnIdx + 1} of ${gd.maxTurns} ${isFinalTurn ? '(FINAL TURN — provide full scoring)' : ''}

Conversation so far:
${this._formatTurnHistory(gd.turns, topicIdx)}

Agent's response (from STT): "${transcript}"

${isFinalTurn
  ? `Score the ENTIRE conversation holistically on 5 criteria, each 0–20:`
  : `Give a partial score so far on 5 criteria, each 0–20:`
}
- fluency       : natural speech flow, no long pauses or hesitations
- persuasion    : logical argument, evidence, convincing
- vocabulary    : professional range, precise word choice
- empathy       : understanding the customer's perspective
- structure     : clear opening, body, and close

Also write:
- strengths    : up to 2 specific things done well (short phrases)
- improvements : up to 2 specific things to improve (short phrases)
- aiReply      : ${isFinalTurn
  ? `empty string "" (conversation is over)`
  : `a realistic, firm pushback from the AI customer (1–2 sentences)`
}

Return JSON only:
{
  "fluency": 0-20,
  "persuasion": 0-20,
  "vocabulary": 0-20,
  "empathy": 0-20,
  "structure": 0-20,
  "overallScore": 0-100,
  "strengths": [],
  "improvements": [],
  "aiReply": ""
}`,
    );

    gd.turns.push({ topicIdx, turnIdx, transcript, evaluation });
    gd.currentTurn = turnIdx + 1;

    const topicDone = isFinalTurn;

    if (topicDone) {
      gd.topicScores.push({
        topicIdx,
        title: topic.title,
        score: evaluation.overallScore,
      });

      const allTopicsDone = topicIdx + 1 >= gd.topics.length;

      if (allTopicsDone) {
        const finalScore = Math.round(
          gd.topicScores.reduce((s: number, t: any) => s + t.score, 0) / gd.topics.length,
        );
        const overallPassed = finalScore >= this.PASS_THRESHOLD.ADVANCED;

        await this.sessionRepo.update(sessionId, {
          completed: true,
          finalScore,
          passed: overallPassed,
          completedAt: new Date(),
          gameData: gd,
        });

        await this._saveAttempt(
          userId,
          'speaking',
          'ADVANCED',
          gd.topicScores.filter((t: any) => t.score >= 75).length,
          gd.topics.length,
          overallPassed,
          gd.topicScores.map((t: any) => ({
            questionId: t.title,
            selectedOption: t.score,
            isCorrect: t.score >= 75,
          })),
        );

        return {
          done: true,
          topicDone: true,
          evaluation,
          transcript,
          result: {
            score: gd.topicScores.filter((t: any) => t.score >= 75).length,
            totalQuestions: gd.topics.length,
            percentage: finalScore,
            finalScore,
            passed: overallPassed,
            requiredPercentage: this.PASS_THRESHOLD.ADVANCED,
            details: gd.topicScores.map((t: any) => ({
              questionId: t.title,
              questionText: t.title,
              selectedOption: t.score,
              correctOption: 75,
              isCorrect: t.score >= 75,
              explanation: `Topic pitch score: ${t.score}%.`,
              transcript: undefined,
            })),
            topicBreakdown: gd.topicScores,
          },
        };
      }

      // Next topic
      gd.currentTopic = topicIdx + 1;
      gd.currentTurn = 0;
      await this.sessionRepo.update(sessionId, { gameData: gd });

      const nextTopic: AdvancedTopic = gd.topics[gd.currentTopic];
      const nextAudio = await this.voice.synthesize(nextTopic.firstMessage, 'af_heart', 1.0);

      return {
        done: false,
        topicDone: true,
        evaluation,
        transcript,
        topicScore: evaluation.overallScore,
        nextTopic: {
          index: gd.currentTopic,
          title: nextTopic.title,
          situation: nextTopic.situation,
          aiMessage: nextTopic.firstMessage,
          aiAudioBase64: nextAudio.toString('base64'),
        },
      };
    }

    // More turns remain
    await this.sessionRepo.update(sessionId, { gameData: gd });

    const aiAudio = evaluation.aiReply
      ? await this.voice.synthesize(evaluation.aiReply, 'af_heart', 1.0)
      : null;

    return {
      done: false,
      topicDone: false,
      evaluation,
      transcript,
      nextTurn: {
        turnIndex: gd.currentTurn,
        aiMessage: evaluation.aiReply,
        aiAudioBase64: aiAudio ? aiAudio.toString('base64') : null,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION STATUS  — GET /assessment/speaking/:level/session/:sessionId
  // ═══════════════════════════════════════════════════════════════════════════

  async getSessionStatus(userId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async _pickPassages(userId: string, count: number) {
    let all = await this.questionRepo.find({
      where: { category: 'speaking', level: 'BEGINNER' },
    });

    // Filter already-seen
    const past = await this.attemptRepo.find({
      where: { userId, category: 'speaking', level: 'BEGINNER' },
      select: ['answers'],
    });
    const seenIds = new Set<string>();
    for (const a of past) {
      for (const ans of (a.answers as any[])) {
        if (ans?.questionId) seenIds.add(ans.questionId);
      }
    }
    let unseen = all.filter(q => !seenIds.has(q.id));
    if (unseen.length < count) unseen = all; // reset if exhausted

    return unseen.sort(() => Math.random() - 0.5).slice(0, count);
  }

  private async _transcribe(buffer: Buffer, filename: string): Promise<string> {
    try {
      return await this.voice.transcribe(buffer, filename);
    } catch (err: any) {
      throw new BadRequestException(
        `STT failed: ${err?.message}. Check STT service is running.`,
      );
    }
  }

  private async _getActiveSession(
    userId: string,
    sessionId: string,
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
  ) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId, level, completed: false },
    });
    if (!session) throw new NotFoundException(`Active ${level} speaking session not found`);
    return session;
  }

  private async _saveAttempt(
    userId: string,
    category: 'speaking' | 'writing',
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    score: number,
    total: number,
    passed: boolean,
    answers: { questionId: string; selectedOption: number; isCorrect: boolean }[],
  ) {
    const attempt = this.attemptRepo.create({
      userId,
      category,
      level,
      score,
      passed,
      answers,
    });
    await this.attemptRepo.save(attempt);
    return attempt;
  }

  private _formatTurnHistory(turns: any[], currentIdx: number): string {
    return turns
      .filter(t => t.scenarioIdx === currentIdx || t.topicIdx === currentIdx)
      .map(t => `Agent: ${t.transcript}`)
      .join('\n') || '(first turn)';
  }

  // ─── Gemini scenario generators ─────────────────────────────────────────────

  private async _generateIntermediateScenarios(): Promise<IntermediateScenario[]> {
    return this.gemini.generateJSON<IntermediateScenario[]>(
      `Generate exactly 5 BPO customer service roleplay scenarios for an INTERMEDIATE English speaking assessment.

Each scenario must cover a different skill:
1. Professional call opening + ID verification
2. Active listening + paraphrasing a billing complaint
3. Objection handling — service fee pushback
4. Placing customer on hold + returning with information
5. Polite call closing + "is there anything else I can help you with?"

Return a JSON array of exactly 5 objects:
[
  {
    "id": "sp-int-1",
    "title": "Call opening",
    "context": "A customer calls about their monthly invoice. They sound slightly confused.",
    "firstMessage": "Hi, I just received my bill and something doesn't look right.",
    "tip": "Greet professionally, verify the caller's identity before pulling up the account."
  }
]

Rules:
- firstMessage must be 1–2 sentences spoken by the AI customer (realistic, mildly concerned, not aggressive)
- context is shown to the agent as a briefing card (2–3 sentences)
- tip is coaching shown to the agent before they speak
- All scenarios must be set in a BPO customer support context (internet/utilities/subscription company)
Return JSON array ONLY, no markdown.`,
    );
  }

  private async _generateAdvancedTopics(): Promise<AdvancedTopic[]> {
    return this.gemini.generateJSON<AdvancedTopic[]>(
      `Generate exactly 5 Advanced BPO English speaking assessment topics.

Each topic must cover a different high-stakes skill:
1. De-escalation — VIP customer threatening to cancel after repeated failures
2. Negotiation — customer demanding full cash refund, agent must offer alternative
3. Persuasive upsell pitch — offer plan upgrade to budget-conscious satisfied customer
4. Escalation decision — complex outage mid-call, must escalate + set callback expectation
5. Compliance boundary — customer pressures agent to bypass account verification

Return a JSON array of exactly 5 objects:
[
  {
    "id": "sp-adv-1",
    "title": "De-escalation",
    "situation": "You are a senior BPO agent. Mr. Chen has been a client for 7 years and has been routed 3 times today without resolution. He is now threatening to cancel his contract worth $4,000/month. You must de-escalate, own the issue, and offer a concrete resolution.",
    "firstMessage": "I have been transferred THREE times today and nobody has fixed my problem. I want to speak to your manager RIGHT NOW or I am cancelling everything."
  }
]

Rules:
- situation is 3–4 sentences of full context shown to the agent as a briefing card
- firstMessage is the AI customer's aggressive/challenging opening line (1–2 sentences)
- Topics must escalate in difficulty from 1 to 5
Return JSON array ONLY, no markdown.`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE UTILITY — word-level F1 similarity (Beginner scoring)
// ─────────────────────────────────────────────────────────────────────────────

function computeF1Similarity(expected: string, transcript: string): number {
  const tok = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  const exp = tok(expected);
  const got = tok(transcript);
  if (!exp.length || !got.length) return 0;

  const freq = new Map<string, number>();
  for (const w of exp) freq.set(w, (freq.get(w) ?? 0) + 1);

  let common = 0;
  const used = new Map<string, number>();
  for (const w of got) {
    const u = used.get(w) ?? 0;
    if (u < (freq.get(w) ?? 0)) { common++; used.set(w, u + 1); }
  }

  const precision = common / got.length;
  const recall    = common / exp.length;
  if (precision + recall === 0) return 0;
  return Math.round((2 * precision * recall) / (precision + recall) * 100);
}

function buildBeginnerFeedback(
  score: number,
  tip: string,
  expected: string,
  transcript: string,
): string {
  const tok = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  const missed = [...new Set(tok(expected))].filter(w => !new Set(tok(transcript)).has(w)).slice(0, 4);
  const hint = missed.length ? ` Words to focus on: "${missed.join('", "')}".` : '';

  if (score >= 90) return `Excellent! (${score}%) ${tip}`;
  if (score >= 70) return `Good — passage passed. (${score}%) ${tip}${hint}`;
  if (score >= 50) return `Almost there (${score}%). Read every word clearly.${hint} Tip: ${tip}`;
  return `Needs work (${score}%). Try again slowly.${hint} Tip: ${tip}`;
}
