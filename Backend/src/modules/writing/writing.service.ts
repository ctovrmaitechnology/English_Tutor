import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WritingBeginner } from './entities/writing-beginner.entity';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { ModuleQuestion } from '../assessment/entities/module-question.entity';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class WritingService {
  constructor(
    @InjectRepository(WritingBeginner)
    private readonly writingRepo: Repository<WritingBeginner>,
    @InjectRepository(AttemptLesson)
    private readonly attemptRepo: Repository<AttemptLesson>,
    @InjectRepository(ModuleQuestion)
    private readonly moduleQuestionRepo: Repository<ModuleQuestion>,
    private readonly geminiService: GeminiService,
  ) { }

  async getQuestionsForLesson(moduleId: string, userId: string, excludeSet?: string) {
    const rawId = (moduleId || '').trim();
    const searchModuleId = rawId.toLowerCase();
    const idsToSearch = Array.from(new Set([
      rawId,
      searchModuleId,
      searchModuleId.startsWith('w') && !searchModuleId.startsWith('wr-') ? `wr-${searchModuleId.slice(1)}` : searchModuleId,
      searchModuleId.startsWith('wr-') ? searchModuleId.replace('wr-', 'w') : searchModuleId,
    ]));

    // 1. First search WritingBeginner table for exact/normalized IDs
    let allDbQuestions: any[] = await this.writingRepo.createQueryBuilder('w')
      .where('LOWER(w.moduleId) IN (:...idsToSearch) OR LOWER(w.lessonId) IN (:...idsToSearch)', { idsToSearch })
      .orderBy('w.questionNumber', 'ASC')
      .addOrderBy('w.createdAt', 'ASC')
      .getMany();

    // 2. If empty in WritingBeginner, search ModuleQuestion table for exact/normalized IDs
    if (!allDbQuestions || allDbQuestions.length === 0) {
      allDbQuestions = await this.moduleQuestionRepo.createQueryBuilder('mq')
        .where('LOWER(mq.moduleId) IN (:...idsToSearch)', { idsToSearch })
        .orderBy('mq.questionNumber', 'ASC')
        .getMany();
    }

    // 3. If still empty, try partial match in WritingBeginner
    if (!allDbQuestions || allDbQuestions.length === 0) {
      allDbQuestions = await this.writingRepo.createQueryBuilder('w')
        .where('LOWER(w.moduleId) LIKE :lk OR LOWER(w.lessonId) LIKE :lk', { lk: `%${searchModuleId}%` })
        .orderBy('w.questionNumber', 'ASC')
        .getMany();
    }

    // 4. If still empty, try partial match in ModuleQuestion
    if (!allDbQuestions || allDbQuestions.length === 0) {
      allDbQuestions = await this.moduleQuestionRepo.createQueryBuilder('mq')
        .where('LOWER(mq.moduleId) LIKE :lk', { lk: `%${searchModuleId}%` })
        .orderBy('mq.questionNumber', 'ASC')
        .getMany();
    }

    // 5. If STILL empty, get any existing questions in WritingBeginner
    if (!allDbQuestions || allDbQuestions.length === 0) {
      allDbQuestions = await this.writingRepo.find({
        order: { questionNumber: 'ASC' },
        take: 20,
      });
    }

    // 6. If STILL empty, get any existing questions in ModuleQuestion
    if (!allDbQuestions || allDbQuestions.length === 0) {
      allDbQuestions = await this.moduleQuestionRepo.find({
        order: { questionNumber: 'ASC' },
        take: 20,
      });
    }

    if (!allDbQuestions || allDbQuestions.length === 0) {
      // 20 Questions fallback array if DB table has not been populated yet
      return {
        set_used: 'SET_1',
        partA: [
          {
            questionNumber: 1,
            question: 'Which sentence demonstrates correct business writing tone?',
            optionA: 'Hey, send me the money ASAP!',
            optionB: 'Please process the payment at your earliest convenience.',
            optionC: 'Give money now.',
            optionD: 'Why money not sent?',
            correctOption: 'B',
            answer: 'Please process the payment at your earliest convenience.',
            part: 'PART_A',
          },
          {
            questionNumber: 2,
            question: 'Choose the correct punctuation: "Dear Ms. Davis___ I am writing to follow up on our previous discussion."',
            optionA: ',',
            optionB: '!',
            optionC: '?',
            optionD: ';',
            correctOption: 'A',
            answer: ',',
            part: 'PART_A',
          },
          {
            questionNumber: 3,
            question: 'Which sign-off is appropriate for a formal business email?',
            optionA: 'Later,',
            optionB: 'Sincerely,',
            optionC: 'Cheers bro,',
            optionD: 'Bye,',
            correctOption: 'B',
            answer: 'Sincerely,',
            part: 'PART_A',
          },
          {
            questionNumber: 4,
            question: 'Identify the grammatically correct sentence:',
            optionA: 'I am writing to inform you about the update.',
            optionB: 'I writing to inform you about update.',
            optionC: 'I am write to inform you update.',
            optionD: 'I writes to informing you about update.',
            correctOption: 'A',
            answer: 'I am writing to inform you about the update.',
            part: 'PART_A',
          },
          {
            questionNumber: 5,
            question: 'Which subject line is most appropriate for a business meeting request?',
            optionA: 'Meeting',
            optionB: 'IMPORTANT URGENT!!',
            optionC: 'Request for Meeting: Project Status Discussion',
            optionD: 'Hey read this',
            correctOption: 'C',
            answer: 'Request for Meeting: Project Status Discussion',
            part: 'PART_A',
          },
          {
            questionNumber: 6,
            question: 'Fill in the blank: "The team ___ working diligently on the project deliverables."',
            optionA: 'is',
            optionB: 'are',
            optionC: 'am',
            optionD: 'be',
            correctOption: 'A',
            answer: 'is',
            part: 'PART_A',
          },
          {
            questionNumber: 7,
            question: 'Select the correct article: "We have received ___ urgent request from the client."',
            optionA: 'a',
            optionB: 'an',
            optionC: 'the',
            optionD: 'no article needed',
            correctOption: 'B',
            answer: 'an',
            part: 'PART_A',
          },
          {
            questionNumber: 8,
            question: 'Choose the most polite way to request a document:',
            optionA: 'Send me the report now.',
            optionB: 'I want the report.',
            optionC: 'Could you please send me the report when ready?',
            optionD: 'Give report.',
            correctOption: 'C',
            answer: 'Could you please send me the report when ready?',
            part: 'PART_A',
          },
          {
            questionNumber: 9,
            question: 'Which sentence correctly uses capitalization?',
            optionA: 'our manager john works at google in new york.',
            optionB: 'Our Manager John works at Google in New York.',
            optionC: 'Our manager John works at Google in New York.',
            optionD: 'our Manager john Works At Google.',
            correctOption: 'C',
            answer: 'Our manager John works at Google in New York.',
            part: 'PART_A',
          },
          {
            questionNumber: 10,
            question: 'Choose the correct preposition: "The meeting is scheduled ___ 10:00 AM on Monday."',
            optionA: 'on',
            optionB: 'at',
            optionC: 'in',
            optionD: 'by',
            correctOption: 'B',
            answer: 'at',
            part: 'PART_A',
          },
          {
            questionNumber: 11,
            question: 'Which phrase represents professional customer service writing?',
            optionA: 'That is not my job.',
            optionB: 'I do not know, figure it out yourself.',
            optionC: 'I would be happy to look into this matter for you.',
            optionD: 'You are wrong about this.',
            correctOption: 'C',
            answer: 'I would be happy to look into this matter for you.',
            part: 'PART_A',
          },
          {
            questionNumber: 12,
            question: 'Identify the sentence with correct verb tense:',
            optionA: 'She submit the report yesterday.',
            optionB: 'She submitted the report yesterday.',
            optionC: 'She submitting the report yesterday.',
            optionD: 'She will submitted the report yesterday.',
            correctOption: 'B',
            answer: 'She submitted the report yesterday.',
            part: 'PART_A',
          },
          {
            questionNumber: 13,
            question: 'Which modal verb expresses a polite suggestion?',
            optionA: 'must',
            optionB: 'should',
            optionC: 'might',
            optionD: 'could',
            correctOption: 'D',
            answer: 'could',
            part: 'PART_A',
          },
          {
            questionNumber: 14,
            question: 'Choose the sentence with correct word order:',
            optionA: 'Why did you call the client yesterday?',
            optionB: 'Why you called the client yesterday?',
            optionC: 'Why did call you the client yesterday?',
            optionD: 'You called client why yesterday?',
            correctOption: 'A',
            answer: 'Why did you call the client yesterday?',
            part: 'PART_A',
          },
          {
            questionNumber: 15,
            question: 'Fill in the blank: "Neither the supervisor nor the employees ___ aware of the change."',
            optionA: 'was',
            optionB: 'were',
            optionC: 'is',
            optionD: 'be',
            correctOption: 'B',
            answer: 'were',
            part: 'PART_A',
          },
          {
            questionNumber: 16,
            question: 'Select the correct conjunction: "We reviewed the proposal, ___ we decided to approve it."',
            optionA: 'and',
            optionB: 'but',
            optionC: 'or',
            optionD: 'nor',
            correctOption: 'A',
            answer: 'and',
            part: 'PART_A',
          },
          {
            questionNumber: 17,
            question: 'Which sentence correctly uses a pronoun?',
            optionA: 'Each employee must submit their own report.',
            optionB: 'Each employee must submit his or her report.',
            optionC: 'Me and John prepared the draft.',
            optionD: 'The client spoke to myself.',
            correctOption: 'B',
            answer: 'Each employee must submit his or her report.',
            part: 'PART_A',
          },
          {
            questionNumber: 18,
            question: 'Choose the correct word: "We need to ___ the issue immediately to prevent further delays."',
            optionA: 'address',
            optionB: 'addres',
            optionC: 'adress',
            optionD: 'adresses',
            correctOption: 'A',
            answer: 'address',
            part: 'PART_A',
          },
          {
            questionNumber: 19,
            question: 'Which sentence shows proper paragraph transition?',
            optionA: 'Furthermore, the data supports our initial findings.',
            optionB: 'Also data supports findings.',
            optionC: 'And data good.',
            optionD: 'Data support.',
            correctOption: 'A',
            answer: 'Furthermore, the data supports our initial findings.',
            part: 'PART_A',
          },
          {
            questionNumber: 20,
            question: 'Select the appropriate response for confirming an appointment:',
            optionA: 'I confirm your appointment for tomorrow at 2 PM.',
            optionB: 'Yeah appointment ok tomorrow 2.',
            optionC: 'Come tomorrow at 2.',
            optionD: 'Appointment set.',
            correctOption: 'A',
            answer: 'I confirm your appointment for tomorrow at 2 PM.',
            part: 'PART_A',
          },
        ],
      };
    }

    // Process questions found in DB
    const distinctSets = Array.from(new Set(allDbQuestions.map(q => q.set).filter(Boolean)));
    let selectedSet: string = 'SET_1';
    let filteredQuestions = allDbQuestions;

    if (distinctSets.length > 0) {
      const pastAttempts = await this.attemptRepo.find({
        where: idsToSearch.map(id => ({ userId, moduleId: id })),
        select: ['set'],
      });
      const usedSets = new Set(pastAttempts.map(a => a.set));
      if (excludeSet) usedSets.add(excludeSet);

      let candidateSets = distinctSets.filter(s => !usedSets.has(s));
      if (candidateSets.length === 0) candidateSets = distinctSets;

      selectedSet = candidateSets[Math.floor(Math.random() * candidateSets.length)];
      const setMatches = allDbQuestions.filter(q => q.set === selectedSet || !q.set);
      if (setMatches.length >= 10) {
        filteredQuestions = setMatches;
      } else {
        // Return all available questions for this lesson if set filtering yields few items
        filteredQuestions = allDbQuestions;
      }
    } else {
      selectedSet = allDbQuestions[0]?.set || 'SET_1';
      filteredQuestions = allDbQuestions;
    }

    const partA = filteredQuestions.filter(q => !q.part || q.part.toUpperCase() === 'PART_A' || q.part === 'A');
    const partB = filteredQuestions.filter(q => q.part && (q.part.toUpperCase() === 'PART_B' || q.part === 'B'));

    // Deduplicate questions by question text
    const uniquePartA: any[] = [];
    const seenTexts = new Set<string>();
    for (const q of (partA.length > 0 ? partA : filteredQuestions)) {
      const text = (q.question || '').trim().toLowerCase();
      if (text && !seenTexts.has(text)) {
        seenTexts.add(text);
        uniquePartA.push(q);
      }
    }

    const result: any = {
      set_used: selectedSet,
      partA: uniquePartA,
    };

    if (partB && partB.length > 0) {
      result.partB = partB;
    }

    return result;
  }

  async addQuestions(questionsData: Partial<WritingBeginner>[]) {
    const questions = this.writingRepo.create(questionsData);
    return this.writingRepo.save(questions);
  }

  async evaluatePartB(transcript: string, question: string) {
    const prompt = `
You are an experienced English writing examiner evaluating a candidate's written English response.

Prompt/Question:
"${question}"

Candidate Written Response:
"${transcript}"

Evaluation Rules:
1. Determine relevance, grammar, vocabulary, sentence structure, and tone.
2. Give actionable feedback and a score from 0-100.
3. Return ONLY valid JSON in this format:

{
  "overallScore": 0,
  "relevance": 0,
  "fluency": 0,
  "vocabulary": 0,
  "grammar": 0,
  "feedback": ""
}
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
    const overallScore = (data.partAScore + data.partBScore) / 2;

    const attempt = this.attemptRepo.create({
      userId: data.userId,
      username: data.username,
      moduleId: data.moduleId,
      lessonId: data.lessonId,
      level: data.level,
      set: data.set,
      overallScore,
      responses: data.responses,
      status: 'completed',
    });

    return this.attemptRepo.save(attempt);
  }

  async getCompletedLessons(userId: string): Promise<string[]> {
    const attempts = await this.attemptRepo.find({
      where: { userId, status: 'completed' },
      select: ['lessonId', 'moduleId'],
    });
    const ids = attempts
      .map(a => a.lessonId || a.moduleId)
      .filter(id => id && id.startsWith('wr-'));
    return [...new Set(ids)];
  }

  async getCompletedLessonIds(userId: string): Promise<string[]> {
    const attempts = await this.attemptRepo.find({
      where: { userId, status: 'completed' },
      select: ['lessonId', 'moduleId'],
    });
    const ids = attempts
      .map(a => a.lessonId || a.moduleId)
      .filter(id => id && id.startsWith('wr-'));
    return [...new Set(ids)];
  }

  async getAttempts(userId: string) {
    const attempts = await this.attemptRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return attempts.filter(a => (a.moduleId && a.moduleId.startsWith('wr-')) || (a.lessonId && a.lessonId.startsWith('wr-')));
  }

  async getAttemptsByLesson(userId: string, lessonId: string) {
    return this.attemptRepo.find({
      where: [
        { userId, lessonId },
        { userId, moduleId: lessonId },
      ],
      order: { createdAt: 'DESC' },
    });
  }
}
