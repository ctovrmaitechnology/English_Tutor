/**
 * Import placement questions from a JSON file into placement_questions.
 *
 * Usage:
 *   npx ts-node src/database/scripts/import-placement-questions-json.ts <path-to-json> [--activate]
 *
 * By default, imported rows are saved with status='draft' — they will NOT
 * be served to real users until you review them and either:
 *   a) re-run this script with --activate once you're confident in the batch, or
 *   b) manually flip status to 'active' for reviewed rows via SQL/admin tool.
 *
 * Supports MIXED question types in one file. Every item needs:
 *   questionSet ('SET_A'|'SET_B'|'SET_C'), setOrder (1-based position),
 *   questionType, section, sectionTitle, marks, skill, difficulty,
 *   cefrLevel, questionText
 * Plus type-specific fields:
 *   mcq                  -> options (exactly 4, distinct), correctOptionIndex (0-3)
 *   fill_blank/matching/
 *   error_correction/
 *   rearrangement         -> correctAnswer (string)
 *   spoken_short_answer   -> passage (string), modelAnswer, responseMode='audio'
 *   spoken_dialogue       -> modelAnswer, responseMode='audio'
 *   free_text/
 *   long_form_writing     -> modelAnswer
 *
 * `questionSet`/`setOrder` in the JSON map to the DB columns `setName`
 * ('A'|'B'|'C', no "SET_" prefix) and `orderInSet` respectively.
 *
 * Only 'mcq' responses are auto-scored by the current backend — every
 * other type is imported and served to users, but is not yet scored (see
 * PlacementQuestion entity doc). This script does not block importing
 * non-MCQ types; it just validates their required fields are present.
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import dataSource from '../../data-source';

const VALID_SKILLS = ['grammar', 'vocabulary', 'reading', 'listening'];
const VALID_CEFR = ['A1', 'A2', 'B1', 'B2', 'C1'];
const VALID_QUESTION_SETS = ['SET_A', 'SET_B', 'SET_C'];
const VALID_QUESTION_TYPES = [
  'mcq', 'fill_blank', 'matching', 'error_correction', 'rearrangement',
  'spoken_short_answer', 'spoken_dialogue', 'free_text', 'long_form_writing',
];
const SET_NAME_MAP: Record<string, string> = { SET_A: 'A', SET_B: 'B', SET_C: 'C' };

interface RawItem {
  questionSet?: unknown;
  setOrder?: unknown;
  questionType?: unknown;
  section?: unknown;
  sectionTitle?: unknown;
  marks?: unknown;
  skill?: unknown;
  difficulty?: unknown;
  cefrLevel?: unknown;
  topic?: unknown;
  questionText?: unknown;
  options?: unknown;
  correctOptionIndex?: unknown;
  correctAnswer?: unknown;
  modelAnswer?: unknown;
  passage?: unknown;
  responseMode?: unknown;
  explanation?: unknown;
}

interface ParsedItem {
  index: number;
  setName: string; // 'A' | 'B' | 'C' — DB column value
  orderInSet: number;
  questionType: string;
  section: string | null;
  sectionTitle: string | null;
  marks: number;
  skill: string;
  difficulty: number;
  cefrLevel: string;
  topic: string | null;
  questionText: string;
  options: string[] | null;
  correctOptionIndex: number | null;
  correctAnswer: string | null;
  modelAnswer: string | null;
  passage: string | null;
  responseMode: string;
  explanation: string | null;
}

interface ItemError {
  index: number;
  message: string;
}

function validateAndParse(raw: unknown): { valid: ParsedItem[]; errors: ItemError[] } {
  if (!Array.isArray(raw)) {
    throw new Error('JSON root must be an array of question objects.');
  }

  const valid: ParsedItem[] = [];
  const errors: ItemError[] = [];

  (raw as RawItem[]).forEach((item, i) => {
    const index = i + 1;
    const errs: string[] = [];

    const questionSetRaw = typeof item.questionSet === 'string' ? item.questionSet.toUpperCase().trim() : '';
    if (!VALID_QUESTION_SETS.includes(questionSetRaw)) {
      errs.push(`invalid questionSet "${String(item.questionSet)}" (must be one of ${VALID_QUESTION_SETS.join('/')})`);
    }
    const setName = SET_NAME_MAP[questionSetRaw] ?? '';

    const orderInSet = typeof item.setOrder === 'number' ? item.setOrder : NaN;
    if (!Number.isInteger(orderInSet) || orderInSet < 1) {
      errs.push(`invalid setOrder "${String(item.setOrder)}" (must be a positive integer)`);
    }

    const questionType = typeof item.questionType === 'string' ? item.questionType.trim() : 'mcq';
    if (!VALID_QUESTION_TYPES.includes(questionType)) {
      errs.push(`invalid questionType "${String(item.questionType)}" (must be one of ${VALID_QUESTION_TYPES.join('/')})`);
    }

    const skill = typeof item.skill === 'string' ? item.skill.toLowerCase().trim() : '';
    if (!VALID_SKILLS.includes(skill)) {
      errs.push(`invalid skill "${String(item.skill)}" (must be one of ${VALID_SKILLS.join('/')})`);
    }

    const difficulty = typeof item.difficulty === 'number' ? item.difficulty : NaN;
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 10) {
      errs.push(`invalid difficulty "${String(item.difficulty)}" (must be an integer 1-10)`);
    }

    const cefrLevel = typeof item.cefrLevel === 'string' ? item.cefrLevel.toUpperCase().trim() : '';
    if (!VALID_CEFR.includes(cefrLevel)) {
      errs.push(`invalid cefrLevel "${String(item.cefrLevel)}" (must be one of ${VALID_CEFR.join('/')})`);
    }

    const questionText = typeof item.questionText === 'string' ? item.questionText.trim() : '';
    if (!questionText) {
      errs.push('questionText is empty or missing');
    }

    const marks = typeof item.marks === 'number' && Number.isInteger(item.marks) && item.marks > 0 ? item.marks : 1;

    // ---- type-specific validation ----
    let options: string[] | null = null;
    let correctOptionIndex: number | null = null;
    let correctAnswer: string | null = null;
    let modelAnswer: string | null = null;
    let passage: string | null = null;

    if (questionType === 'mcq') {
      const rawOptions = Array.isArray(item.options)
        ? item.options.map((o) => (typeof o === 'string' ? o.trim() : ''))
        : [];
      if (rawOptions.length !== 4) {
        errs.push(`mcq questions need exactly 4 options (got ${rawOptions.length})`);
      } else if (rawOptions.some((o) => !o)) {
        errs.push('one or more options is empty — all 4 are required');
      } else if (new Set(rawOptions.map((o) => o.toLowerCase())).size !== rawOptions.length) {
        errs.push('duplicate options found — all 4 options must be distinct');
      } else {
        options = rawOptions;
      }
      const idx = typeof item.correctOptionIndex === 'number' ? item.correctOptionIndex : NaN;
      if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
        errs.push(`invalid correctOptionIndex "${String(item.correctOptionIndex)}" (must be an integer 0-3)`);
      } else {
        correctOptionIndex = idx;
      }
    } else if (['fill_blank', 'matching', 'error_correction', 'rearrangement'].includes(questionType)) {
      const ans = typeof item.correctAnswer === 'string' ? item.correctAnswer.trim() : '';
      if (!ans) {
        errs.push(`questionType "${questionType}" requires a non-empty correctAnswer`);
      } else {
        correctAnswer = ans;
      }
    } else {
      // spoken_short_answer, spoken_dialogue, free_text, long_form_writing
      const ans = typeof item.modelAnswer === 'string' ? item.modelAnswer.trim() : '';
      if (!ans) {
        errs.push(`questionType "${questionType}" requires a non-empty modelAnswer`);
      } else {
        modelAnswer = ans;
      }
      if (questionType === 'spoken_short_answer') {
        const p = typeof item.passage === 'string' ? item.passage.trim() : '';
        if (!p) errs.push('spoken_short_answer requires a non-empty passage');
        else passage = p;
      }
    }

    const responseMode = typeof item.responseMode === 'string' && item.responseMode === 'audio' ? 'audio' : 'text';
    const section = typeof item.section === 'string' && item.section.trim() ? item.section.trim() : null;
    const sectionTitle = typeof item.sectionTitle === 'string' && item.sectionTitle.trim() ? item.sectionTitle.trim() : null;
    const topic = typeof item.topic === 'string' && item.topic.trim() ? item.topic.trim() : null;
    const explanation = typeof item.explanation === 'string' && item.explanation.trim() ? item.explanation.trim() : null;

    if (errs.length > 0) {
      errors.push({ index, message: errs.join('; ') });
      return;
    }

    valid.push({
      index, setName, orderInSet, questionType, section, sectionTitle, marks,
      skill, difficulty, cefrLevel, topic, questionText,
      options, correctOptionIndex, correctAnswer, modelAnswer, passage,
      responseMode, explanation,
    });
  });

  return { valid, errors };
}

/** Duplicate (setName, orderInSet) pairs are a blocking error; gaps are a warning. */
function checkSetIntegrity(valid: ParsedItem[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const bySet = new Map<string, ParsedItem[]>();
  for (const q of valid) {
    if (!bySet.has(q.setName)) bySet.set(q.setName, []);
    bySet.get(q.setName)!.push(q);
  }

  for (const [setName, items] of bySet.entries()) {
    const positions = items.map((q) => q.orderInSet);
    const seen = new Map<number, number>();
    for (const p of positions) seen.set(p, (seen.get(p) || 0) + 1);
    const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      errors.push(
        `Set ${setName}: duplicate setOrder value(s): ` +
        duplicates.map(([pos, count]) => `position ${pos} appears ${count} times`).join(', '),
      );
    }
    const max = Math.max(...positions);
    const missing: number[] = [];
    for (let p = 1; p <= max; p++) if (!seen.has(p)) missing.push(p);
    if (missing.length > 0) {
      warnings.push(
        `Set ${setName}: covers up to position ${max} but is missing ` +
        `${missing.slice(0, 10).join(', ')}${missing.length > 10 ? `, +${missing.length - 10} more` : ''}.`,
      );
    }
  }

  return { errors, warnings };
}

async function main() {
  const filePath = process.argv[2];
  const activate = process.argv.includes('--activate');

  if (!filePath) {
    console.error('Usage: npx ts-node src/database/scripts/import-placement-questions-json.ts <path-to-json> [--activate]');
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err: any) {
    console.error(`Invalid JSON: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const { valid, errors } = validateAndParse(raw);

  console.log(`Parsed ${(raw as unknown[]).length} item(s): ${valid.length} valid, ${errors.length} invalid.\n`);

  if (errors.length > 0) {
    console.log('--- Items skipped due to validation errors ---');
    for (const e of errors) console.log(`  Item #${e.index}: ${e.message}`);
    console.log('');
  }

  if (valid.length === 0) {
    console.log('No valid items to import. Fix the errors above and re-run.');
    return;
  }

  const integrity = checkSetIntegrity(valid);
  if (integrity.errors.length > 0) {
    console.log('--- Set integrity errors (blocking) ---');
    integrity.errors.forEach((e) => console.log(`  ${e}`));
    console.log('\nFix duplicate positions before importing. Nothing was inserted.');
    process.exitCode = 1;
    return;
  }
  if (integrity.warnings.length > 0) {
    console.log('--- Set integrity warnings (non-blocking) ---');
    integrity.warnings.forEach((w) => console.log(`  ${w}`));
    console.log('');
  }

  // Type distribution summary, so you can see at a glance what's scorable today.
  const typeCounts = new Map<string, number>();
  for (const q of valid) typeCounts.set(q.questionType, (typeCounts.get(q.questionType) || 0) + 1);
  console.log('--- Question type breakdown ---');
  for (const [type, count] of typeCounts.entries()) {
    const scorable = type === 'mcq' ? '(auto-scored)' : '(saved, NOT auto-scored yet)';
    console.log(`  ${type}: ${count} ${scorable}`);
  }
  console.log('');

  const ds = await dataSource.initialize();
  try {
    const status = activate ? 'active' : 'draft';

    for (const q of valid) {
      await ds.query(
        `INSERT INTO placement_questions
          ("questionText","options","correctOptionIndex","correctAnswer","modelAnswer","passage",
           "responseMode","explanation","skill","difficulty","cefrLevel","topic","status",
           "questionGroupId","version","setName","orderInSet","questionType","section",
           "sectionTitle","marks")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          q.questionText,
          q.options ? JSON.stringify(q.options) : null,
          q.correctOptionIndex,
          q.correctAnswer,
          q.modelAnswer,
          q.passage,
          q.responseMode,
          q.explanation,
          q.skill,
          q.difficulty,
          q.cefrLevel,
          q.topic,
          status,
          randomUUID(),
          1,
          q.setName,
          q.orderInSet,
          q.questionType,
          q.section,
          q.sectionTitle,
          q.marks,
        ],
      );
    }

    console.log(`Imported ${valid.length} question(s) with status='${status}'.`);
    if (!activate) {
      console.log(
        `\nThese are saved as DRAFT and will NOT be served to real users yet.\n` +
        `Review them, then re-run with --activate, or update status manually:\n` +
        `  UPDATE placement_questions SET status = 'active' WHERE status = 'draft';`,
      );
    }
  } catch (err: any) {
    if (err?.code === '23505') {
      console.error(
        '\nInsert failed: a question already exists at this (setName, orderInSet) position ' +
        '(unique constraint violation). This usually means you\'re re-importing the same file.',
      );
    } else {
      throw err;
    }
    process.exitCode = 1;
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exitCode = 1;
});
