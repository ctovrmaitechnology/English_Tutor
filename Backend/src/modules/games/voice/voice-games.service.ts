import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeminiService } from '../../gemini/gemini.service';
import { VoiceService } from '../../voice/voice.service';
import { GameSession } from '../entities/game-session.entity';
import { StartGameDto } from '../dto/start-game.dto';

@Injectable()
export class VoiceGamesService {
  private readonly logger = new Logger(VoiceGamesService.name);

  constructor(
    @InjectRepository(GameSession)
    private sessionRepo: Repository<GameSession>,
    private gemini: GeminiService,
    private voice: VoiceService,
  ) {}

  // ════════════════════════════════════════════
  // GAME 1 — TONGUE TWISTER CHALLENGE
  // AI gives tongue twister → user repeats →
  // AI scores pronunciation accuracy
  // ════════════════════════════════════════════

  async startTongueTwister(userId: string, dto: StartGameDto) {
    const difficulty = dto.difficulty || 'BEGINNER';

    const data = await this.gemini.generateJSON<{
      twisters: {
        text: string;
        focusSound: string;
        tip: string;
      }[];
    }>(
      `Generate 3 tongue twisters for BPO English learners.
       Difficulty: ${difficulty}
       
       BEGINNER: simple sounds, short phrases
       INTERMEDIATE: moderate complexity
       ADVANCED: long, complex tongue twisters
       
       Focus on sounds that Indian/Asian speakers commonly struggle with:
       th, v/w, r/l, s/sh, p/b
       
       Return JSON only:
       {
         "twisters": [
           {
             "text": "She sells seashells by the seashore",
             "focusSound": "sh/s distinction",
             "tip": "Keep your tongue behind your teeth for 's' sounds"
           }
         ]
       }`
    );

    // Generate TTS audio for the first twister
    const firstTwister = data.twisters[0];
    const audioBuffer = await this.voice.synthesize(
      firstTwister.text,
      'af_heart',
      0.75, // slightly slower for learners to hear clearly
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'TONGUE_TWISTER',
      category: 'VOICE',
      difficulty,
      score: 0,
      maxScore: 100,
      gameData: {
        twisters: data.twisters,
        currentTwister: 0,
        attempts: [],
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      totalTwisters: data.twisters.length,
      currentTwister: {
        number: 1,
        text: firstTwister.text,
        focusSound: firstTwister.focusSound,
        tip: firstTwister.tip,
        audioBase64: audioBuffer.toString('base64'),
      },
      instructions: 'Listen to the tongue twister, then repeat it as clearly as possible.',
    };
  }

  async submitTongueTwister(
    userId: string,
    sessionId: string,
    audioBuffer: Buffer,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.twisters[gameData.currentTwister];

    // STT — transcribe user's audio
    const transcript = await this.voice.transcribe(audioBuffer);

    // Evaluate pronunciation with Gemini
    const evaluation = await this.gemini.generateJSON<{
      accuracyScore: number;
      fluencyScore: number;
      pronunciationScore: number;
      overallScore: number;
      errors: string[];
      feedback: string;
      wellPronounced: string[];
    }>(
      `Evaluate tongue twister pronunciation:
       
       Original text: "${current.text}"
       Focus sound: "${current.focusSound}"
       User's transcript (from STT): "${transcript}"
       
       Compare the transcript to the original.
       Missing or wrong words suggest pronunciation errors.
       
       Score out of 100:
       Return JSON only:
       {
         "accuracyScore": 0-40,
         "fluencyScore": 0-30,
         "pronunciationScore": 0-30,
         "overallScore": 0-100,
         "errors": ["specific pronunciation issues"],
         "feedback": "Encouraging specific feedback",
         "wellPronounced": ["parts done well"]
       }`
    );

    gameData.attempts.push({
      twister: current.text,
      transcript,
      score: evaluation.overallScore,
    });

    gameData.currentTwister += 1;
    session.score += evaluation.overallScore;

    const isLast = gameData.currentTwister >= gameData.twisters.length;

    if (isLast) {
      const avgScore = Math.round(session.score / gameData.twisters.length);
      const xpEarned = Math.floor(avgScore / 2);

      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: avgScore,
        xpEarned,
        accuracy: avgScore,
        completedAt: new Date(),
        gameData,
      });

      return {
        gameOver: true,
        transcript,
        evaluation,
        finalScore: avgScore,
        xpEarned,
      };
    }

    // Generate audio for next twister
    const next = gameData.twisters[gameData.currentTwister];
    const nextAudio = await this.voice.synthesize(next.text, 'af_heart', 0.75);

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      gameOver: false,
      transcript,
      evaluation,
      nextTwister: {
        number: gameData.currentTwister + 1,
        text: next.text,
        focusSound: next.focusSound,
        tip: next.tip,
        audioBase64: nextAudio.toString('base64'),
      },
    };
  }

  // ════════════════════════════════════════════
  // GAME 2 — ECHO MASTER
  // AI speaks → user repeats →
  // Score based on how closely user matches
  // ════════════════════════════════════════════

  async startEchoMaster(userId: string, dto: StartGameDto) {
    const difficulty = dto.difficulty || 'BEGINNER';

    const data = await this.gemini.generateJSON<{
      sentences: {
        text: string;
        focusArea: string;
      }[];
    }>(
      `Generate 8 sentences for Echo Master pronunciation game.
       Difficulty: ${difficulty}
       
       Use professional BPO/customer service sentences.
       Focus on: stress patterns, intonation, rhythm.
       
       BEGINNER: short simple sentences
       INTERMEDIATE: medium sentences with varied stress
       ADVANCED: complex sentences with professional vocabulary
       
       Return JSON only:
       {
         "sentences": [
           {
             "text": "Thank you for calling customer support.",
             "focusArea": "Word stress and intonation"
           }
         ]
       }`
    );

    // Generate audio for first sentence
    const first = data.sentences[0];
    const audioBuffer = await this.voice.synthesize(
      first.text,
      'af_heart',
      0.85,
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'ECHO_MASTER',
      category: 'VOICE',
      difficulty,
      score: 0,
      maxScore: data.sentences.length * 100,
      gameData: {
        sentences: data.sentences,
        currentSentence: 0,
        results: [],
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      totalSentences: data.sentences.length,
      currentSentence: {
        number: 1,
        text: first.text,
        focusArea: first.focusArea,
        audioBase64: audioBuffer.toString('base64'),
      },
      instructions: 'Listen carefully and repeat the sentence as closely as possible.',
    };
  }

  async submitEchoMaster(
    userId: string,
    sessionId: string,
    audioBuffer: Buffer,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.sentences[gameData.currentSentence];

    // Transcribe user's audio
    const transcript = await this.voice.transcribe(audioBuffer);

    // Score how closely they matched
    const evaluation = await this.gemini.generateJSON<{
      matchScore: number;
      stressScore: number;
      completenessScore: number;
      overallScore: number;
      differences: string[];
      feedback: string;
    }>(
      `Echo Master evaluation:
       
       AI said: "${current.text}"
       User said (transcript): "${transcript}"
       Focus area: "${current.focusArea}"
       
       How closely did the user match the original?
       Check: word accuracy, completeness, any additions/omissions.
       
       Return JSON only:
       {
         "matchScore": 0-40,
         "stressScore": 0-30,
         "completenessScore": 0-30,
         "overallScore": 0-100,
         "differences": ["words missed or changed"],
         "feedback": "Specific improvement tip"
       }`
    );

    gameData.results.push({
      original: current.text,
      transcript,
      score: evaluation.overallScore,
    });

    gameData.currentSentence += 1;
    session.score += evaluation.overallScore;

    const isLast = gameData.currentSentence >= gameData.sentences.length;

    if (isLast) {
      const avgScore = Math.round(
        session.score / gameData.sentences.length,
      );
      const xpEarned = Math.floor(avgScore / 2);

      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: avgScore,
        xpEarned,
        accuracy: avgScore,
        completedAt: new Date(),
        gameData,
      });

      return {
        gameOver: true,
        transcript,
        evaluation,
        finalScore: avgScore,
        xpEarned,
      };
    }

    // Generate next sentence audio
    const next = gameData.sentences[gameData.currentSentence];
    const nextAudio = await this.voice.synthesize(next.text, 'af_heart', 0.85);

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      gameOver: false,
      transcript,
      evaluation,
      nextSentence: {
        number: gameData.currentSentence + 1,
        text: next.text,
        focusArea: next.focusArea,
        audioBase64: nextAudio.toString('base64'),
      },
    };
  }

  // ════════════════════════════════════════════
  // GAME 3 — ACCENT DRILL
  // Targeted drills for MTI patterns
  // Personalized based on difficulty/history
  // ════════════════════════════════════════════

  async startAccentDrill(userId: string, dto: StartGameDto) {
    const difficulty = dto.difficulty || 'BEGINNER';

    const drill = await this.gemini.generateJSON<{
      targetSounds: string[];
      exercises: {
        type: string;
        instruction: string;
        text: string;
        tip: string;
      }[];
    }>(
      `Generate Accent Drill exercises for Indian BPO English learners.
       Difficulty: ${difficulty}
       
       Common MTI patterns for Indian speakers:
       - Replacing 'v' with 'w' (very → wery)
       - Replacing 'th' with 'd' or 't' (this → dis, three → tree)
       - Retroflex sounds
       - Vowel length differences
       
       Create 6 targeted exercises.
       Types: MINIMAL_PAIR, WORD_DRILL, SENTENCE_DRILL
       
       Return JSON only:
       {
         "targetSounds": ["th", "v/w"],
         "exercises": [
           {
             "type": "MINIMAL_PAIR",
             "instruction": "Say both words clearly",
             "text": "vine / wine",
             "tip": "For 'v': bite your lower lip with upper teeth"
           }
         ]
       }`
    );

    // Generate TTS for first exercise
    const first = drill.exercises[0];
    const audioBuffer = await this.voice.synthesize(
      first.text,
      'af_heart',
      0.7, // slower for drill
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'ACCENT_DRILL',
      category: 'VOICE',
      difficulty,
      score: 0,
      maxScore: drill.exercises.length * 100,
      gameData: {
        targetSounds: drill.targetSounds,
        exercises: drill.exercises,
        currentExercise: 0,
        results: [],
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      targetSounds: drill.targetSounds,
      totalExercises: drill.exercises.length,
      currentExercise: {
        number: 1,
        type: first.type,
        instruction: first.instruction,
        text: first.text,
        tip: first.tip,
        audioBase64: audioBuffer.toString('base64'),
      },
      instructions: 'Focus on the target sounds. Listen to the model pronunciation, then repeat.',
    };
  }

  async submitAccentDrill(
    userId: string,
    sessionId: string,
    audioBuffer: Buffer,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;
    const current = gameData.exercises[gameData.currentExercise];

    const transcript = await this.voice.transcribe(audioBuffer);

    const evaluation = await this.gemini.generateJSON<{
      targetSoundScore: number;
      clarityScore: number;
      overallScore: number;
      mtiDetected: boolean;
      mtiPatterns: string[];
      feedback: string;
      improvement: string;
    }>(
      `Accent Drill evaluation:
       
       Exercise type: ${current.type}
       Target text: "${current.text}"
       Target sounds: ${JSON.stringify(gameData.targetSounds)}
       User's transcript: "${transcript}"
       
       Did the user correctly pronounce the target sounds?
       Look for MTI patterns in Indian English.
       
       Return JSON only:
       {
         "targetSoundScore": 0-50,
         "clarityScore": 0-50,
         "overallScore": 0-100,
         "mtiDetected": true/false,
         "mtiPatterns": ["detected patterns like th→d"],
         "feedback": "Specific feedback on the target sound",
         "improvement": "One clear tip to improve"
       }`
    );

    gameData.results.push({
      exercise: current.text,
      transcript,
      score: evaluation.overallScore,
      mtiDetected: evaluation.mtiDetected,
      patterns: evaluation.mtiPatterns,
    });

    gameData.currentExercise += 1;
    session.score += evaluation.overallScore;

    const isLast = gameData.currentExercise >= gameData.exercises.length;

    if (isLast) {
      const avgScore = Math.round(
        session.score / gameData.exercises.length,
      );
      const xpEarned = Math.floor(avgScore / 2);

      // Summary of MTI patterns found
      const allPatterns = gameData.results
        .flatMap((r: any) => r.patterns)
        .filter(Boolean);

      await this.sessionRepo.update(sessionId, {
        completed: true,
        score: avgScore,
        xpEarned,
        accuracy: avgScore,
        completedAt: new Date(),
        gameData,
      });

      return {
        gameOver: true,
        transcript,
        evaluation,
        finalScore: avgScore,
        xpEarned,
        mtiSummary: {
          patterns: [...new Set(allPatterns)],
          message: allPatterns.length === 0
            ? 'Excellent! No MTI patterns detected.'
            : `Focus areas: ${[...new Set(allPatterns)].join(', ')}`,
        },
      };
    }

    // Generate next exercise audio
    const next = gameData.exercises[gameData.currentExercise];
    const nextAudio = await this.voice.synthesize(next.text, 'af_heart', 0.7);

    await this.sessionRepo.update(sessionId, {
      score: session.score,
      gameData,
    });

    return {
      gameOver: false,
      transcript,
      evaluation,
      nextExercise: {
        number: gameData.currentExercise + 1,
        type: next.type,
        instruction: next.instruction,
        text: next.text,
        tip: next.tip,
        audioBase64: nextAudio.toString('base64'),
      },
    };
  }

  // ════════════════════════════════════════════
  // GAME 4 — SPEED SPEAK
  // Say as many words as possible in a category
  // in 30 seconds
  // ════════════════════════════════════════════

  async startSpeedSpeak(userId: string, dto: StartGameDto) {
    const category = await this.gemini.generateJSON<{
      category: string;
      examples: string[];
      instruction: string;
    }>(
      `Generate a Speed Speak category for BPO English learners.
       Pick a relevant professional vocabulary category.
       
       Examples: Customer Service Words, Emotions, Office Items,
       Action Verbs, Polite Phrases, Problem-Solution Words
       
       Return JSON only:
       {
         "category": "Customer Service Action Verbs",
         "examples": ["assist", "resolve", "escalate"],
         "instruction": "Say as many customer service action verbs as possible!"
       }`
    );

    const session = this.sessionRepo.create({
      userId,
      gameType: 'SPEED_SPEAK',
      category: 'VOICE',
      difficulty: dto.difficulty || 'BEGINNER',
      score: 0,
      maxScore: 100,
      gameData: {
        category: category.category,
        examples: category.examples,
        timeLimit: 30,
        transcript: null,
        wordsFound: [],
      },
    });

    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      category: category.category,
      examples: category.examples,
      instruction: category.instruction,
      timeLimit: 30,
      message: `You have 30 seconds! Say as many "${category.category}" words as you can!`,
    };
  }

  async submitSpeedSpeak(
    userId: string,
    sessionId: string,
    audioBuffer: Buffer,
  ) {
    const session = await this.getActiveSession(userId, sessionId);
    const gameData = session.gameData as any;

    // Transcribe all words spoken
    const transcript = await this.voice.transcribe(audioBuffer);

    // Count valid words in category
    const validation = await this.gemini.generateJSON<{
      validWords: string[];
      invalidWords: string[];
      totalValid: number;
      score: number;
      feedback: string;
      missedExamples: string[];
    }>(
      `Speed Speak validation:
       
       Category: "${gameData.category}"
       User spoke these words: "${transcript}"
       
       Extract individual words from the transcript.
       Check which ones are valid for this category.
       
       Return JSON only:
       {
         "validWords": ["words that belong to the category"],
         "invalidWords": ["words that don't belong"],
         "totalValid": 0,
         "score": 0-100,
         "feedback": "Good job! / You could have said...",
         "missedExamples": ["common words in this category they missed"]
       }`
    );

    const xpEarned = Math.floor(validation.score / 2);

    await this.sessionRepo.update(sessionId, {
      completed: true,
      score: validation.score,
      xpEarned,
      accuracy: validation.totalValid > 0
        ? (validation.validWords.length / validation.totalValid) * 100
        : 0,
      completedAt: new Date(),
      gameData: {
        ...gameData,
        transcript,
        wordsFound: validation.validWords,
      },
    });

    return {
      score: validation.score,
      xpEarned,
      transcript,
      validWords: validation.validWords,
      invalidWords: validation.invalidWords,
      totalValidWords: validation.totalValid,
      feedback: validation.feedback,
      missedExamples: validation.missedExamples,
      message: `You said ${validation.totalValid} valid words! Score: ${validation.score}`,
    };
  }

  // ════════════════════════════════════════════
  // PERSONAL BEST
  // ════════════════════════════════════════════

  async getPersonalBest(userId: string) {
    const gameTypes = [
      'TONGUE_TWISTER',
      'ECHO_MASTER',
      'ACCENT_DRILL',
      'SPEED_SPEAK',
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