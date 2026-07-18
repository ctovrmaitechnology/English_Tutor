import * as fs from 'fs';
import * as path from 'path';
import { CefrLevel, PlacementSkill, QuestionSet, QuestionType, ResponseMode } from '../entities/placement-question.entity';

export interface SeedQuestion {
  questionText: string;
  options: string[] | null;
  correctOptionIndex: number | null;
  correctAnswer?: string | null;
  modelAnswer?: string | null;
  passage?: string | null;
  responseMode?: ResponseMode;
  explanation?: string | null;
  skill: PlacementSkill;
  difficulty: number; // 1-10
  cefrLevel: CefrLevel;
  topic?: string;
  tags?: string[];
  setName: QuestionSet;
  orderInSet: number;
  questionType?: QuestionType;
  section?: string | null;
  sectionTitle?: string | null;
  marks?: number;
}

function loadPlacementQuestions(): SeedQuestion[] {
  const possiblePaths = [
    path.join(process.cwd(), 'placement-data', 'placement-questions.json'),
    path.resolve(__dirname, '../../../../placement-data/placement-questions.json'),
    path.resolve(__dirname, '../../../placement-data/placement-questions.json'),
  ];

  let rawContent = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      rawContent = fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
      break;
    }
  }

  if (!rawContent) {
    return [];
  }

  const rawItems: any[] = JSON.parse(rawContent);
  if (!Array.isArray(rawItems)) {
    return [];
  }

  const bySet = new Map<QuestionSet, any[]>();
  for (const item of rawItems) {
    const rawSet = typeof item.questionSet === 'string' ? item.questionSet.toUpperCase().trim() : '';
    const setName: QuestionSet =
      rawSet === 'SET_A' || rawSet === 'A' ? 'A' :
      rawSet === 'SET_B' || rawSet === 'B' ? 'B' :
      rawSet === 'SET_C' || rawSet === 'C' ? 'C' : 'A';
    if (!bySet.has(setName)) bySet.set(setName, []);
    bySet.get(setName)!.push(item);
  }

  const result: SeedQuestion[] = [];
  const validTypes: QuestionType[] = [
    'mcq', 'fill_blank', 'matching', 'error_correction', 'rearrangement',
    'spoken_short_answer', 'spoken_dialogue', 'free_text', 'long_form_writing'
  ];

  for (const [setName, items] of bySet.entries()) {
    const seenPositions = new Set<number>();
    let nextAutoOrder = 1;

    items.forEach((item) => {
      let orderInSet = typeof item.setOrder === 'number' && item.setOrder > 0 ? item.setOrder : nextAutoOrder;
      if (seenPositions.has(orderInSet)) {
        while (seenPositions.has(nextAutoOrder)) nextAutoOrder++;
        orderInSet = nextAutoOrder;
      }
      seenPositions.add(orderInSet);
      while (seenPositions.has(nextAutoOrder)) nextAutoOrder++;

      const difficulty: number = typeof item.difficulty === 'number' && item.difficulty >= 1 && item.difficulty <= 10
        ? item.difficulty
        : Math.min(10, Math.max(1, Math.ceil((orderInSet / 86) * 9)));

      let cefrLevel: CefrLevel = 'B1';
      if (item.cefrLevel && ['A1', 'A2', 'B1', 'B2', 'C1'].includes(item.cefrLevel)) {
        cefrLevel = item.cefrLevel;
      } else if (difficulty <= 2) {
        cefrLevel = 'A1';
      } else if (difficulty <= 4) {
        cefrLevel = 'A2';
      } else if (difficulty <= 7) {
        cefrLevel = 'B1';
      } else if (difficulty <= 9) {
        cefrLevel = 'B2';
      } else {
        cefrLevel = 'C1';
      }

      let skill: PlacementSkill = 'grammar';
      if (item.skill && ['grammar', 'vocabulary', 'reading', 'listening'].includes(item.skill)) {
        skill = item.skill;
      } else {
        const st = (item.sectionTitle || '').toLowerCase();
        const txt = (item.questionText || '').toLowerCase();
        const type = item.questionType || 'mcq';
        if (type === 'spoken_short_answer' || st.includes('reading')) {
          skill = 'reading';
        } else if (type === 'spoken_dialogue' || st.includes('dialogue') || st.includes('listening')) {
          skill = 'listening';
        } else if (
          st.includes('vocabulary') ||
          st.includes('synonym') ||
          st.includes('antonym') ||
          txt.includes('synonym') ||
          txt.includes('antonym') ||
          txt.includes('spelled') ||
          txt.includes('meaning')
        ) {
          skill = 'vocabulary';
        }
      }

      const questionType: QuestionType = validTypes.includes(item.questionType as any)
        ? (item.questionType as QuestionType)
        : 'mcq';

      const responseMode: ResponseMode = item.responseMode === 'audio' ? 'audio' : 'text';

      result.push({
        questionText: item.questionText || '',
        options: Array.isArray(item.options) ? item.options : null,
        correctOptionIndex: typeof item.correctOptionIndex === 'number' ? item.correctOptionIndex : null,
        correctAnswer: item.correctAnswer || null,
        modelAnswer: item.modelAnswer || null,
        passage: item.passage || null,
        responseMode,
        explanation: item.explanation || null,
        skill,
        difficulty,
        cefrLevel,
        topic: item.topic || item.sectionTitle || 'general',
        tags: item.tags || [],
        setName,
        orderInSet,
        questionType,
        section: item.section || null,
        sectionTitle: item.sectionTitle || null,
        marks: typeof item.marks === 'number' ? item.marks : 1,
      });
    });
  }

  return result;
}

/**
 * Loads and exports the full bank directly from placement-data/placement-questions.json.
 */
export const PLACEMENT_QUESTION_SEED: SeedQuestion[] = loadPlacementQuestions();
