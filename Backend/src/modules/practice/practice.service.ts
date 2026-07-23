import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { ModuleQuestion } from '../assessment/entities/module-question.entity';

@Injectable()
export class PracticeService {
  constructor(
    @InjectRepository(AttemptLesson)
    private readonly attemptRepo: Repository<AttemptLesson>,
    @InjectRepository(ModuleQuestion)
    private readonly questionRepo: Repository<ModuleQuestion>,
  ) {}

  async getUniquePracticeQuestions(lessonId: string, userId: string) {
    // 1. Find all sets the user has already attempted for this specific lesson
    const attempts = await this.attemptRepo.find({
      where: [
        { userId, lessonId },
        { userId, moduleId: lessonId }
      ],
      select: ['set']
    });

    const attemptedSets = new Set(attempts.map(a => a.set).filter(Boolean));

    // 2. Find all available sets for this lesson in the question bank
    // Note: In ModuleQuestion, 'moduleId' usually stores the lesson ID (e.g. 'sp-1-1') 
    // depending on how it was seeded. Let's query both just in case.
    const allQuestions = await this.questionRepo.find({
      where: { moduleId: lessonId }
    });

    if (allQuestions.length === 0) {
      // Don't throw 404 as it pollutes the console and triggers error states.
      // Return empty sets so the frontend can gracefully fall back to local data.
      return { set_used: 'fallback', partA: [], partB: [] };
    }

    const availableSets = Array.from(new Set(allQuestions.map(q => q.set).filter(Boolean)));

    // 3. Determine which set to give them (a set they haven't attempted)
    let candidateSets = availableSets.filter(s => !attemptedSets.has(s));
    
    // If they have attempted all sets, just pick a random one from all available sets
    if (candidateSets.length === 0) {
      candidateSets = availableSets;
    }

    const chosenSet = candidateSets[Math.floor(Math.random() * candidateSets.length)];

    // 4. Return the questions for the chosen set
    const selectedQuestions = allQuestions
      .filter(q => q.set === chosenSet)
      .sort((a, b) => a.questionNumber - b.questionNumber);

    return {
      set_used: chosenSet,
      partA: selectedQuestions.filter((q) => q.part === 'PART_A'),
      partB: selectedQuestions.filter((q) => q.part === 'PART_B'),
    };
  }
}
