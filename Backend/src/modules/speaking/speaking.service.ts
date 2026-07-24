import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpeakingBeginner } from './entities/speaking-beginner.entity';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class SpeakingService {
  constructor(
    @InjectRepository(SpeakingBeginner)
    private readonly speakingRepo: Repository<SpeakingBeginner>,
    @InjectRepository(AttemptLesson)
    private readonly attemptRepo: Repository<AttemptLesson>,
    private readonly geminiService: GeminiService,
  ) { }

  async getQuestionsForLesson(moduleId: string, userId: string, excludeSet?: string, specificSet?: string) {
    if (specificSet) {
      const questions = await this.speakingRepo.find({
        where: { moduleId, set: specificSet },
        order: { questionNumber: 'ASC' },
      });
      const partA = questions.filter((q) => q.part === 'PART_A');
      const partB = questions.filter((q) => q.part === 'PART_B');
      return { set_used: specificSet, partA, partB };
    }
    const queryResult = await this.speakingRepo
      .createQueryBuilder('speaking')
      .select('DISTINCT(speaking.set)', 'set')
      .where('speaking.moduleId = :moduleId', { moduleId })
      .getRawMany();

    if (!queryResult || queryResult.length === 0) {
      throw new NotFoundException(`No questions found for moduleId: ${moduleId}`);
    }

    const availableSets = queryResult.map((res) => res.set);

    // 2. Find which sets the user has already completed for this module
    const pastAttempts = await this.attemptRepo.find({
      where: { userId, moduleId },
      select: ['set'],
    });
    
    // We want to exclude sets the user has already done, PLUS any explicitly excluded set (e.g. from failing Part A)
    const usedSets = new Set(pastAttempts.map(a => a.set));
    if (excludeSet) {
      usedSets.add(excludeSet);
    }

    let candidateSets = availableSets.filter(s => !usedSets.has(s));

    // If they've done all sets, or we excluded everything, fallback to the full list (minus the explicitly excluded one if possible)
    if (candidateSets.length === 0) {
      if (excludeSet) {
        candidateSets = availableSets.filter(s => s !== excludeSet);
      }
      if (candidateSets.length === 0) {
        candidateSets = availableSets;
      }
    }

    // 3. Randomly pick one set from candidates
    const randomSet = candidateSets[Math.floor(Math.random() * candidateSets.length)];

    // 4. Fetch all questions for this moduleId and the randomly chosen set
    const questions = await this.speakingRepo.find({
      where: {
        moduleId: moduleId,
        set: randomSet,
      },
      order: {
        questionNumber: 'ASC',
      },
    });

    // 4. Split into Part A and Part B
    const partA = questions.filter((q) => q.part === 'PART_A');
    const partB = questions.filter((q) => q.part === 'PART_B');

    return {
      set_used: randomSet,
      partA,
      partB,
    };
  }

  async evaluatePartB(transcript: string, question: string) {
    const prompt = `
You are an experienced English speaking examiner evaluating a beginner English learner.

Your task is to evaluate ONLY the spoken response. The transcript comes from speech-to-text, so ignore punctuation, capitalization, spelling mistakes caused by speech recognition, and formatting errors.

Question:
"${question}"

Student's Spoken Transcript:
"${transcript}"

Evaluation Rules:

1. First determine whether the student's answer is relevant to the question.
   - If the student answers the question correctly and stays on topic, give a high relevance score.
   - If the answer is unrelated, copied, random words, or mostly off-topic, reduce the overall score significantly.
   - Do NOT give high scores to irrelevant answers even if the English is fluent.

2. Ignore:
   - Capital letters or lowercase letters
   - Missing punctuation
   - Minor speech-to-text transcription mistakes
   - Typing or formatting errors

3. Evaluate:
   - Relevance to the question (most important)
   - Fluency (natural flow of speech)
   - Vocabulary (appropriate and varied words)
   - Grammar (basic spoken grammar only)
   - Completeness (whether enough information is provided)

4. Do NOT be overly strict. The student is a beginner English learner.

5. Give encouraging feedback mentioning:
   - One thing they did well.
   - One thing to improve.
   - If the answer is unrelated, clearly mention that they should answer the question more directly.

Return ONLY valid JSON.

{
  "overallScore": 0,
  "relevance": 0,
  "fluency": 0,
  "vocabulary": 0,
  "grammar": 0,
  "feedback": ""
}

Scoring Guide:

90-100:
- Fully answers the question
- Natural speech
- Good vocabulary
- Very few grammar mistakes

75-89:
- Mostly answers the question
- Good fluency
- Some grammar or vocabulary mistakes

60-74:
- Partially answers the question
- Limited vocabulary
- Noticeable pauses or grammar mistakes

40-59:
- Weak answer
- Poor vocabulary
- Many mistakes
- Partially off-topic

0-39:
- Completely unrelated answer
- Random words
- Did not answer the question
- Extremely short or meaningless response

Return ONLY the JSON object.
`;

    return this.geminiService.generateJSON(prompt);
  }

  async saveAttempt(data: {
    userId: string;
    username: string;
    moduleId: string;
    lessonId: string;
    level: string;
    set: string;
    partAScore: number;
    partBScore: number;
    responses: any;
  }) {
    const lId = data.lessonId || data.moduleId;
    const existing = await this.attemptRepo.findOne({
      where: [
        { userId: data.userId, lessonId: lId },
        { userId: data.userId, moduleId: lId },
      ],
      order: { createdAt: 'DESC' },
    });

    const mergedResponses = {
      ...(existing?.responses || {}),
      ...(data.responses || {}),
    };

    const hasPartA = !!(
      mergedResponses?.partA &&
      (Array.isArray(mergedResponses.partA.questions)
        ? mergedResponses.partA.questions.length > 0
        : mergedResponses.partA.score !== undefined)
    );

    const hasPartB = !!(
      mergedResponses?.partB &&
      (Array.isArray(mergedResponses.partB.questions)
        ? mergedResponses.partB.questions.length > 0
        : (mergedResponses.partB.score !== undefined || data.partBScore !== undefined))
    );

    const status = (hasPartA && hasPartB) ? 'completed' : 'incomplete';

    const pA = data.partAScore ?? mergedResponses?.partA?.score ?? mergedResponses?.partA?.overallScore;
    const pB = data.partBScore ?? mergedResponses?.partB?.score ?? mergedResponses?.partB?.overallScore;

    let overallScore: number;
    if (hasPartA && hasPartB) {
      const scoreA = pA !== undefined ? pA : 0;
      const scoreB = pB !== undefined ? pB : 0;
      overallScore = Math.round((scoreA + scoreB) / 2);
    } else if (hasPartA) {
      overallScore = Math.round(pA !== undefined ? pA : 0);
    } else if (hasPartB) {
      overallScore = Math.round(pB !== undefined ? pB : 0);
    } else {
      overallScore = Math.round((data.partAScore + data.partBScore) / 2);
    }

    if (existing) {
      existing.overallScore = overallScore;
      existing.responses = mergedResponses;
      existing.status = status;
      if (data.set) existing.set = data.set;
      if (data.username) existing.username = data.username;
      return this.attemptRepo.save(existing);
    }

    const attempt = this.attemptRepo.create({
      userId: data.userId,
      username: data.username,
      moduleId: data.moduleId,
      lessonId: data.lessonId,
      level: data.level,
      set: data.set,
      overallScore,
      responses: mergedResponses,
      status,
    });

    return this.attemptRepo.save(attempt);
  }

  async getCompletedLessons(userId: string): Promise<string[]> {
    return this.getCompletedLessonIds(userId);
  }

  // Lean method — returns only unique completed lessonIds for a given userId
  // Used by the frontend unlock logic: e.g. ["sp-1-1", "sp-1-2"]
  async getCompletedLessonIds(userId: string): Promise<string[]> {
    const attempts = await this.attemptRepo.find({
      where: { userId, status: 'completed' },
      select: ['lessonId', 'moduleId', 'responses'],
    });

    const validIds = attempts
      .filter(a => {
        const id = a.lessonId || a.moduleId;
        if (id?.startsWith('sp-')) {
          const hasPartA = !!(
            a.responses?.partA &&
            (Array.isArray(a.responses.partA.questions)
              ? a.responses.partA.questions.length > 0
              : a.responses.partA.score !== undefined)
          );
          const hasPartB = !!(
            a.responses?.partB &&
            (Array.isArray(a.responses.partB.questions)
              ? a.responses.partB.questions.length > 0
              : (a.responses.partB.score !== undefined || a.responses.partB.overallScore !== undefined))
          );
          return hasPartA && hasPartB;
        }
        return true;
      })
      .map(a => a.lessonId || a.moduleId)
      .filter(Boolean);

    return [...new Set(validIds)];
  }

  // GET all attempts for a user (all lessons)
  async getAttempts(userId: string) {
    return this.attemptRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // GET attempts for a specific lesson
  async getAttemptsByLesson(userId: string, lessonId: string) {
    return this.attemptRepo.find({
      where: { userId, lessonId },
      order: { createdAt: 'DESC' },
    });
  }
}
