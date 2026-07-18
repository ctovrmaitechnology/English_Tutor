import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiService } from '../../gemini/gemini.service';
import { GameSession } from '../entities/game-session.entity';
import { StartGameDto } from '../dto/start-game.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';

@Injectable()
export class StoryService {
  private readonly logger = new Logger(StoryService.name);

  constructor(
    @InjectRepository(GameSession)
    private sessionRepo: Repository<GameSession>,
    private gemini: GeminiService,
  ) {}

  // ════════════════════════════════════════════
  // GAME 1 — STORY BUILDER
  // AI starts story → user adds sentence →
  // AI continues → 10 turns → AI evaluates
  // ════════════════════════════════════════════

  async startStoryBuilder(userId: string, dto: StartGameDto) {
    const opening = await this.gemini.generateJSON<{
      opening: string;
      genre: string;
      setting: string;
    }>(
      `Start a creative story for an English learner.
       Keep it engaging, simple, and workplace/everyday themed.
       Write exactly 2 opening sentences.
       
       Return JSON only:
       {
         "opening": "Two sentence story opening",
         "genre": "Adventure/Drama/Mystery/Comedy",
         "setting": "Brief setting description"
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'STORY_BUILDER',
      category: 'STORY',
      difficulty: dto.difficulty || 'BEGINNER',
      score: 0,
      maxScore: 100,
      gameData: {
        genre: opening.genre,
        setting: opening.setting,
        story: [{ by: 'ai', text: opening.opening }],
        userTurns: 0,
        maxUserTurns: 5,
        userSentences: [],
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      genre: opening.genre,
      setting: opening.setting,
      aiOpening: opening.opening,
      turnsLeft: 5,
      instructions: 'Add the next sentence to continue the story. Make it creative and grammatically correct!',
    };
  }

  async continueStoryBuilder(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    // Evaluate user's sentence
    const evaluation = await this.gemini.generateJSON<{
      grammarScore: number;
      creativityScore: number;
      relevanceScore: number;
      feedback: string;
      correctedSentence: string;
    }>(
      `Evaluate this story sentence from an English learner:
       
       Story so far: "${gameData.story.map((s: any) => s.text).join(' ')}"
       User added: "${dto.answer}"
       
       Score out of 10 each:
       Return JSON only:
       {
         "grammarScore": 0-10,
         "creativityScore": 0-10,
         "relevanceScore": 0-10,
         "feedback": "Brief encouraging feedback",
         "correctedSentence": "Grammatically corrected version if needed, else same"
       }`
    );

    const roundScore =
      evaluation.grammarScore +
      evaluation.creativityScore +
      evaluation.relevanceScore;

    gameData.story.push({ by: 'user', text: dto.answer });
    gameData.userSentences.push({
      sentence: dto.answer,
      scores: {
        grammar: evaluation.grammarScore,
        creativity: evaluation.creativityScore,
        relevance: evaluation.relevanceScore,
      },
      corrected: evaluation.correctedSentence,
    });
    gameData.userTurns += 1;
    session.score += roundScore;

    const isLastTurn = gameData.userTurns >= gameData.maxUserTurns;

    if (isLastTurn) {
      // Final AI sentence + full evaluation
      const finalAI = await this.gemini.chat(
        gameData.story.map((s: any) => ({
          role: s.by === 'ai' ? 'model' : 'user',
          text: s.text,
        })),
        `You are a creative story co-author. 
         Write a satisfying 2-sentence ending to this story.
         Keep it appropriate for a workplace English learning app.`
      );

      gameData.story.push({ by: 'ai', text: finalAI });

      const finalEval = await this.gemini.generateJSON<{
        overallScore: number;
        grammarAverage: number;
        creativityAverage: number;
        vocabularyRichness: number;
        summary: string;
        improvements: string[];
        bestSentence: string;
      }>(
        `Final evaluation of this English learner's story contributions:
         
         Full story: "${gameData.story.map((s: any) => s.text).join(' ')}"
         User's sentences only: ${JSON.stringify(gameData.userSentences.map((s: any) => s.sentence))}
         
         Return JSON only:
         {
           "overallScore": 0-100,
           "grammarAverage": 0-10,
           "creativityAverage": 0-10,
           "vocabularyRichness": 0-10,
           "summary": "Overall assessment",
           "improvements": ["tip1", "tip2"],
           "bestSentence": "The user's best sentence"
         }`
      );

      const xpEarned = Math.floor(finalEval.overallScore / 2);

      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: finalEval.overallScore,
        xpEarned,
        accuracy: finalEval.overallScore,
        completedAt: new Date(),
        gameData,
      });

      return {
        gameOver: true,
        aiEnding: finalAI,
        fullStory: gameData.story.map((s: any) => s.text).join(' '),
        evaluation: finalEval,
        xpEarned,
        feedback: evaluation.feedback,
      };
    }

    // AI continues the story
    const aiContinuation = await this.gemini.chat(
      gameData.story.map((s: any) => ({
        role: s.by === 'ai' ? 'model' : 'user',
        text: s.text,
      })),
      `You are a creative story co-author.
       Continue the story with exactly 1-2 sentences.
       Keep it engaging and leave room for the learner to add more.
       Match the tone and setting already established.`
    );

    gameData.story.push({ by: 'ai', text: aiContinuation });

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      gameOver: false,
      feedback: evaluation.feedback,
      correctedSentence: evaluation.correctedSentence,
      roundScore,
      scores: {
        grammar: evaluation.grammarScore,
        creativity: evaluation.creativityScore,
        relevance: evaluation.relevanceScore,
      },
      aiContinuation,
      turnsLeft: gameData.maxUserTurns - gameData.userTurns,
      totalScore: session.score,
    };
  }

  // ════════════════════════════════════════════
  // GAME 2 — NEWS ANCHOR
  // AI generates a script → user reads aloud →
  // AI scores fluency, pronunciation, pace
  // ════════════════════════════════════════════

  async startNewsAnchor(userId: string, dto: StartGameDto) {
    const difficulty = dto.difficulty || 'BEGINNER';

    const script = await this.gemini.generateJSON<{
      headline: string;
      script: string;
      wordCount: number;
      targetWPM: number;
    }>(
      `Generate a news anchor reading script for BPO English learners.
       Difficulty: ${difficulty}
       
       BEGINNER: 60-80 words, simple sentences
       INTERMEDIATE: 100-120 words, moderate complexity
       ADVANCED: 150-180 words, complex sentences, varied vocabulary
       
       Topic: workplace, technology, or general business news.
       
       Return JSON only:
       {
         "headline": "News headline",
         "script": "Full news script to read aloud",
         "wordCount": 80,
         "targetWPM": 120
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'NEWS_ANCHOR',
      category: 'STORY',
      difficulty,
      score: 0,
      maxScore: 100,
      gameData: {
        headline: script.headline,
        script: script.script,
        wordCount: script.wordCount,
        targetWPM: script.targetWPM,
        startTime: null,
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      headline: script.headline,
      script: script.script,
      wordCount: script.wordCount,
      targetWPM: script.targetWPM,
      instructions: 'Read the script aloud clearly and at a natural news anchor pace.',
    };
  }

  async submitNewsAnchor(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    // dto.answer = transcript from STT
    // dto.timeMs = total time taken to read
    const timeTakenSeconds = (dto.timeMs || 0) / 1000;
    const wordsPerMinute = timeTakenSeconds > 0
      ? Math.round((gameData.wordCount / timeTakenSeconds) * 60)
      : 0;

    const evaluation = await this.gemini.generateJSON<{
      fluencyScore: number;
      accuracyScore: number;
      paceScore: number;
      clarityScore: number;
      overallScore: number;
      missedWords: string[];
      mispronounced: string[];
      feedback: string;
      improvements: string[];
    }>(
      `Evaluate this News Anchor reading performance:
       
       Original script: "${gameData.script}"
       User's transcript (from speech recognition): "${dto.answer}"
       Target WPM: ${gameData.targetWPM}
       Actual WPM: ${wordsPerMinute}
       
       Score each area out of 25:
       - Fluency: smooth reading without pauses
       - Accuracy: how closely they followed the script
       - Pace: closeness to target WPM
       - Clarity: clear pronunciation
       
       Return JSON only:
       {
         "fluencyScore": 0-25,
         "accuracyScore": 0-25,
         "paceScore": 0-25,
         "clarityScore": 0-25,
         "overallScore": 0-100,
         "missedWords": ["words skipped or wrong"],
         "mispronounced": ["words likely mispronounced"],
         "feedback": "Overall feedback",
         "improvements": ["tip1", "tip2"]
       }`
    );

    const xpEarned = Math.floor(evaluation.overallScore / 2);

    await this.sessionRepo.update(sessionId, {
      completed: true,
      score: evaluation.overallScore,
      xpEarned,
      accuracy: evaluation.overallScore,
      completedAt: new Date(),
    });

    return {
      overallScore: evaluation.overallScore,
      xpEarned,
      wordsPerMinute,
      targetWPM: gameData.targetWPM,
      breakdown: {
        fluency: evaluation.fluencyScore,
        accuracy: evaluation.accuracyScore,
        pace: evaluation.paceScore,
        clarity: evaluation.clarityScore,
      },
      missedWords: evaluation.missedWords,
      mispronounced: evaluation.mispronounced,
      feedback: evaluation.feedback,
      improvements: evaluation.improvements,
    };
  }

  // ════════════════════════════════════════════
  // GAME 3 — JOB INTERVIEW SIMULATOR
  // AI plays hiring manager
  // 5-minute mock interview
  // ════════════════════════════════════════════

  async startJobInterview(userId: string, dto: StartGameDto) {
    const difficulty = dto.difficulty || 'BEGINNER';

    const setup = await this.gemini.generateJSON<{
      companyName: string;
      role: string;
      interviewerName: string;
      firstQuestion: string;
    }>(
      `Create a job interview setup for BPO English learners.
       Difficulty: ${difficulty}
       
       BEGINNER: Entry-level customer service role
       INTERMEDIATE: Senior agent or team lead role
       ADVANCED: Quality analyst or operations manager role
       
       Return JSON only:
       {
         "companyName": "TechSupport Solutions",
         "role": "Customer Service Representative",
         "interviewerName": "Ms. Priya",
         "firstQuestion": "Tell me about yourself and why you want this role."
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'JOB_INTERVIEW',
      category: 'STORY',
      difficulty,
      score: 0,
      maxScore: 100,
      gameData: {
        companyName: setup.companyName,
        role: setup.role,
        interviewerName: setup.interviewerName,
        messages: [
          {
            role: 'model',
            text: `Good morning! I am ${setup.interviewerName} from ${setup.companyName}. 
                   We are looking for a ${setup.role}. ${setup.firstQuestion}`,
          },
        ],
        questionCount: 1,
        maxQuestions: 6,
        answers: [],
      },
    });

    const saved = await this.sessionRepo.save(session);
    const gameData = session.gameData as any;

    return {
      sessionId: saved.id,
      companyName: setup.companyName,
      role: setup.role,
      interviewerName: setup.interviewerName,
      interviewerMessage: gameData.messages[0].text,
      questionsLeft: 5,
      instructions: 'Answer confidently and professionally. You have 6 questions.',
    };
  }

  async answerJobInterview(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    gameData.messages.push({ role: 'user', text: dto.answer });

    // Evaluate the answer
    const evaluation = await this.gemini.generateJSON<{
      confidenceScore: number;
      grammarScore: number;
      relevanceScore: number;
      vocabularyScore: number;
      feedback: string;
    }>(
      `Evaluate this job interview answer:
       
       Role: ${gameData.role}
       Question context: "${gameData.messages[gameData.messages.length - 2]?.text}"
       Candidate's answer: "${dto.answer}"
       
       Score out of 5 each:
       Return JSON only:
       {
         "confidenceScore": 0-5,
         "grammarScore": 0-5,
         "relevanceScore": 0-5,
         "vocabularyScore": 0-5,
         "feedback": "Brief coaching tip"
       }`
    );

    const roundScore =
      evaluation.confidenceScore +
      evaluation.grammarScore +
      evaluation.relevanceScore +
      evaluation.vocabularyScore;

    gameData.answers.push({
      answer: dto.answer,
      scores: evaluation,
    });

    gameData.questionCount += 1;
    session.score += roundScore;

    const isLastQuestion = gameData.questionCount > gameData.maxQuestions;

    if (isLastQuestion) {
      // Final evaluation
      const finalEval = await this.gemini.generateJSON<{
        overallScore: number;
        hiringDecision: string;
        strengths: string[];
        weaknesses: string[];
        summary: string;
        improvements: string[];
      }>(
        `Final job interview evaluation:
         
         Role: ${gameData.role}
         Company: ${gameData.companyName}
         All answers: ${JSON.stringify(gameData.answers.map((a: any) => a.answer))}
         
         Return JSON only:
         {
           "overallScore": 0-100,
           "hiringDecision": "Strong Yes / Yes / Maybe / No",
           "strengths": ["strength1", "strength2"],
           "weaknesses": ["area1", "area2"],
           "summary": "Overall interview performance",
           "improvements": ["tip1", "tip2", "tip3"]
         }`
      );

      const xpEarned = Math.floor(finalEval.overallScore / 2);

      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: finalEval.overallScore,
        xpEarned,
        accuracy: finalEval.overallScore,
        completedAt: new Date(),
        gameData,
      });

      return {
        gameOver: true,
        evaluation: finalEval,
        xpEarned,
        lastFeedback: evaluation.feedback,
      };
    }

    // AI asks next question
    const nextQuestion = await this.gemini.chat(
      gameData.messages,
      `You are ${gameData.interviewerName}, a professional interviewer at ${gameData.companyName}
       interviewing for the role of ${gameData.role}.
       Ask the next relevant interview question.
       Keep questions realistic for BPO/customer service roles.
       Be professional but friendly.
       Ask only ONE question at a time.
       Questions asked so far: ${gameData.questionCount}`
    );

    gameData.messages.push({ role: 'model', text: nextQuestion });

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      gameOver: false,
      feedback: evaluation.feedback,
      roundScore,
      questionsLeft: gameData.maxQuestions - gameData.questionCount,
      interviewerQuestion: nextQuestion,
      currentScore: session.score,
    };
  }

  // ════════════════════════════════════════════
  // GAME 4 — DEBATE ME
  // AI takes one side → user argues opposite
  // AI evaluates argument quality
  // ════════════════════════════════════════════

  async startDebateMe(userId: string, dto: StartGameDto) {
    const topics = await this.gemini.generateJSON<{
      topic: string;
      aiSide: string;
      userSide: string;
      aiOpeningArgument: string;
    }>(
      `Generate a debate topic for BPO English learners.
       Choose a workplace/professional topic that is easy to argue.
       
       Examples: 
       - "Work from home is better than office work"
       - "Customers are always right"
       - "AI will replace human customer service agents"
       
       Return JSON only:
       {
         "topic": "Debate topic statement",
         "aiSide": "FOR / AGAINST",
         "userSide": "AGAINST / FOR",
         "aiOpeningArgument": "AI's opening argument (2-3 sentences)"
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'DEBATE_ME',
      category: 'STORY',
      difficulty: dto.difficulty || 'BEGINNER',
      score: 0,
      maxScore: 100,
      gameData: {
        topic: topics.topic,
        aiSide: topics.aiSide,
        userSide: topics.userSide,
        messages: [
          { role: 'model', text: topics.aiOpeningArgument },
        ],
        roundCount: 0,
        maxRounds: 4,
        userArguments: [],
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      topic: topics.topic,
      yourSide: topics.userSide,
      aiSide: topics.aiSide,
      aiArgument: topics.aiOpeningArgument,
      roundsLeft: 4,
      instructions: `Argue the ${topics.userSide} side. Make clear, confident points!`,
    };
  }

  async argueDebateMe(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    gameData.messages.push({ role: 'user', text: dto.answer });

    // Evaluate user's argument
    const evaluation = await this.gemini.generateJSON<{
      argumentStrength: number;
      vocabularyScore: number;
      grammarScore: number;
      clarityScore: number;
      feedback: string;
    }>(
      `Evaluate this debate argument:
       
       Topic: "${gameData.topic}"
       User is arguing: ${gameData.userSide}
       User's argument: "${dto.answer}"
       
       Score out of 10 each:
       Return JSON only:
       {
         "argumentStrength": 0-10,
         "vocabularyScore": 0-10,
         "grammarScore": 0-10,
         "clarityScore": 0-10,
         "feedback": "Brief coaching tip"
       }`
    );

    const roundScore =
      evaluation.argumentStrength +
      evaluation.vocabularyScore +
      evaluation.grammarScore +
      evaluation.clarityScore;

    gameData.userArguments.push({
      argument: dto.answer,
      scores: evaluation,
    });

    gameData.roundCount += 1;
    session.score += roundScore;

    const isLastRound = gameData.roundCount >= gameData.maxRounds;

    if (isLastRound) {
      // Final verdict
      const verdict = await this.gemini.generateJSON<{
        winner: string;
        overallScore: number;
        userScoreSummary: string;
        strengths: string[];
        improvements: string[];
        vocabularyHighlights: string[];
      }>(
        `Final debate evaluation:
         
         Topic: "${gameData.topic}"
         User argued: ${gameData.userSide}
         User's arguments: ${JSON.stringify(gameData.userArguments.map((a: any) => a.argument))}
         
         Return JSON only:
         {
           "winner": "User / AI / Draw",
           "overallScore": 0-100,
           "userScoreSummary": "Summary of performance",
           "strengths": ["strength1", "strength2"],
           "improvements": ["improvement1", "improvement2"],
           "vocabularyHighlights": ["good words used by user"]
         }`
      );

      const xpEarned = Math.floor(verdict.overallScore / 2);

      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: verdict.overallScore,
        xpEarned,
        accuracy: verdict.overallScore,
        completedAt: new Date(),
        gameData,
      });

      return {
        gameOver: true,
        verdict,
        xpEarned,
        lastFeedback: evaluation.feedback,
      };
    }

    // AI counter-argues
    const aiCounterArgument = await this.gemini.chat(
      gameData.messages,
      `You are debating the topic: "${gameData.topic}"
       You are arguing the ${gameData.aiSide} side.
       Respond to the user's argument with a strong counter-argument.
       Keep it 2-3 sentences. Be respectful but firm.
       Use professional vocabulary appropriate for BPO learners.`
    );

    gameData.messages.push({ role: 'model', text: aiCounterArgument });

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      gameOver: false,
      feedback: evaluation.feedback,
      roundScore,
      roundsLeft: gameData.maxRounds - gameData.roundCount,
      aiCounterArgument,
      currentScore: session.score,
    };
  }

  // ════════════════════════════════════════════
  // PERSONAL BEST
  // ════════════════════════════════════════════

  async getPersonalBest(userId: string) {
    const gameTypes = [
      'STORY_BUILDER',
      'NEWS_ANCHOR',
      'JOB_INTERVIEW',
      'DEBATE_ME',
    ];

    const results = await Promise.all(
      gameTypes.map(gameType =>
        this.sessionRepo.findOne({
          where: { userId, gameType, completed: true },
          order: { score: 'DESC' },
          select: ['gameType', 'score', 'accuracy', 'completedAt'],
        })
      )
    );

    return results.filter(Boolean);
  }

  // ════════════════════════════════════════════
  // HELPER
  // ════════════════════════════════════════════

  private async getActiveSession(userId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId, completed: false },
    });
    if (!session) throw new NotFoundException('Game session not found');
    return session;
  }
}