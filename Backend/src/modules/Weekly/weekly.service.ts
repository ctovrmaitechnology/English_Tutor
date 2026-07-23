import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyAssessment } from './entities/weekly-assessment.entity';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { SpeakingBeginner } from '../speaking/entities/speaking-beginner.entity';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class WeeklyService {
  constructor(
    @InjectRepository(WeeklyAssessment)
    private weeklyRepo: Repository<WeeklyAssessment>,
    @InjectRepository(AttemptLesson)
    private attemptRepo: Repository<AttemptLesson>,
    @InjectRepository(SpeakingBeginner)
    private speakingRepo: Repository<SpeakingBeginner>,
    private readonly gemini: GeminiService,
  ) {}

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async generateWeeklyTest(userId: string) {
    // 1. Fetch completed lessons for the user, ordered by most recently completed
    const completedLessons = await this.attemptRepo.find({
      where: { userId, status: 'completed' },
      order: { createdAt: 'DESC' },
    });

    if (!completedLessons.length) {
      return {
        instructions: 'No completed modules found for this week.',
        questions: [],
        modulesCovered: [],
      };
    }

    const moduleSetMap = new Map<string, Set<string>>();
    const orderedModules: string[] = [];
    const orderedLessons: string[] = [];

    for (const attempt of completedLessons) {
      if (!attempt.lessonId) continue;
      
      if (!moduleSetMap.has(attempt.lessonId)) {
        moduleSetMap.set(attempt.lessonId, new Set<string>());
        orderedLessons.push(attempt.lessonId); // e.g. sp-1-1
      }
      moduleSetMap.get(attempt.lessonId).add(attempt.set);

      if (attempt.moduleId && !orderedModules.includes(attempt.moduleId)) {
        orderedModules.push(attempt.moduleId); // e.g. sp-1
      }
    }

    let testQuestions: any[] = [];
    // Define the universe of sets
    const allAvailableSets = ['SET_1', 'SET_2', 'SET_3', 'SET_4', 'SET_5'];
    
    // Tracker for sets we use during this generation so we don't reuse them
    const chosenSetsTracker = new Map<string, Set<string>>();
    for (const [lesson, sets] of moduleSetMap.entries()) {
      chosenSetsTracker.set(lesson, new Set(sets));
    }

    // 3. PASS 1: Try to get ONE unattempted set for EACH completed lesson
    for (const lessonId of orderedLessons) {
      if (testQuestions.length >= 50) break;

      const usedSets = chosenSetsTracker.get(lessonId);
      const unattemptedSets = allAvailableSets.filter((s) => !usedSets.has(s));

      if (unattemptedSets.length > 0) {
        const randomIndex = Math.floor(Math.random() * unattemptedSets.length);
        const chosenSet = unattemptedSets[randomIndex];
        usedSets.add(chosenSet); // mark as used

        const questions = await this.speakingRepo.find({
          // In SpeakingBeginner, the 'sp-1-1' value is stored in moduleId
          where: { moduleId: lessonId, set: chosenSet },
        });

        testQuestions = testQuestions.concat(this.shuffleArray(questions));
      }
    }

    // 4. PASS 2: If we still have less than 50 questions, fetch more sets 
    // from the most recently completed lessons until we hit 50
    if (testQuestions.length < 50) {
      for (const lessonId of orderedLessons) {
        if (testQuestions.length >= 50) break;

        const usedSets = chosenSetsTracker.get(lessonId);
        let unattemptedSets = allAvailableSets.filter((s) => !usedSets.has(s));

        while (unattemptedSets.length > 0 && testQuestions.length < 50) {
          const randomIndex = Math.floor(Math.random() * unattemptedSets.length);
          const chosenSet = unattemptedSets[randomIndex];
          usedSets.add(chosenSet);
          unattemptedSets = allAvailableSets.filter((s) => !usedSets.has(s));

          const questions = await this.speakingRepo.find({
            // In SpeakingBeginner, the 'sp-1-1' value is stored in moduleId
            where: { moduleId: lessonId, set: chosenSet },
          });

          testQuestions = testQuestions.concat(this.shuffleArray(questions));
        }
      }
    }

    // 5. Group questions by questionNumber so that Part A and Part B stay together
    const groups = new Map<string, any[]>();
    for (const q of testQuestions) {
      const key = `${q.moduleId}-${q.set}-${q.questionNumber}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(q);
    }

    // Convert to array of groups and shuffle the groups
    let groupedQuestions = Array.from(groups.values());
    groupedQuestions = this.shuffleArray(groupedQuestions);

    // Limit to 25 groups to ensure exactly 50 questions (since each group is usually A and B)
    // Some writing questions might not be paired, so we'll flatten first and stop exactly at 50,
    // but we'll distribute them such that all PART_A (and non-PART_B) come first, 
    // and all PART_B come second, maintaining the same relative order.
    
    let partA = [];
    let partB = [];
    
    for (const group of groupedQuestions) {
      for (const q of group) {
        if (q.part === 'PART_B') {
          partB.push(q);
        } else {
          partA.push(q);
        }
      }
    }

    let finalQuestions = [...partA, ...partB].slice(0, 50);

    return {
      instructions: 'Weekly Assessment',
      questions: finalQuestions,
      modulesCovered: orderedModules,
      lessonsCovered: orderedLessons,
    };
  }

  async saveWeeklyScore(
    userId: string,
    username: string,
    modulesCovered: string[],
    lessonsCovered: string[],
    score: number,
  ) {
    const assessment = this.weeklyRepo.create({
      userId,
      username,
      modulesCovered,
      lessonsCovered,
      score,
    });
    return this.weeklyRepo.save(assessment);
  }

  async evaluateSpeech(transcript: string, instruction: string): Promise<any> {
    if (!transcript || !transcript.trim()) return { correct: false };

    const prompt = `
You are an experienced English speaking examiner evaluating a beginner English learner.

Your task is to evaluate ONLY the spoken response. The transcript comes from speech-to-text, so ignore punctuation, capitalization, spelling mistakes caused by speech recognition, and formatting errors.

Question:
"${instruction}"

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

    try {
      const result = await this.gemini.generateJSON<any>(prompt);
      // We consider it "correct" for the weekly test if the overallScore is >= 60
      return { 
        correct: result.overallScore >= 60,
        evaluation: result 
      };
    } catch (err) {
      console.warn(`AI grading failed for free-text response:`, err);
      return { correct: false }; 
    }
  }
}
