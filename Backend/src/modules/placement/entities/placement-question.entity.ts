import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PlacementSkill = 'grammar' | 'vocabulary' | 'reading' | 'listening';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type QuestionStatus = 'active' | 'retired' | 'draft';
export type QuestionSet = 'A' | 'B' | 'C';
export type QuestionType =
  | 'mcq'
  | 'fill_blank'
  | 'matching'
  | 'error_correction'
  | 'rearrangement'
  | 'spoken_short_answer'
  | 'spoken_dialogue'
  | 'free_text'
  | 'long_form_writing';
export type ResponseMode = 'text' | 'audio';

/**
 * Question bank for the Initial Placement Assessment.
 *
 * Selection model: 3 fixed, pre-authored, difficulty-balanced parallel
 * "forms" (Set A / B / C), each a complete ordered question sequence.
 * One whole set is assigned to a user at attempt-start and played back in
 * fixed order — this is NOT live adaptive branching.
 *
 * Question types: only 'mcq' is auto-scored today (via options/
 * correctOptionIndex). All other types (fill_blank, spoken_dialogue,
 * free_text, etc.) are stored and served to the user, but their responses
 * are NOT automatically scored yet — see PlacementResponse and
 * PlacementService for the scoring boundary. Storing them now means the
 * full assessment content exists in the DB and nothing has to be
 * re-imported later when scoring is built for these types.
 */
@Entity('placement_questions')
@Index(['status', 'setName', 'orderInSet']) // <- the index the selection query relies on
@Index(['setName', 'orderInSet'], { unique: true, where: `status != 'retired'` })
export class PlacementQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, default: 'mcq' })
  questionType: QuestionType;

  /** e.g. 'A'..'J' — the exam paper section this question belongs to. */
  @Column({ type: 'varchar', length: 5, nullable: true })
  section: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sectionTitle: string;

  /** Marks this question is worth (papers vary: 1, 2, or 5 marks per question). */
  @Column({ type: 'smallint', default: 1 })
  marks: number;

  @Column({ type: 'text' })
  questionText: string;

  /** Only populated for questionType='mcq'. */
  @Column({ type: 'jsonb', nullable: true })
  options: string[] | null;

  /** Only populated for questionType='mcq'. 0-based index into options. */
  @Column({ type: 'int', nullable: true })
  correctOptionIndex: number | null;

  /**
   * Exact-match expected answer for fill_blank / matching /
   * error_correction / rearrangement types. Scoring for these is not
   * implemented yet (see class doc) — this field just stores the answer
   * so it's ready when that scoring logic is built.
   */
  @Column({ type: 'text', nullable: true })
  correctAnswer: string | null;

  /**
   * Reference/model answer for open-ended types (spoken_dialogue,
   * spoken_short_answer, free_text, long_form_writing). These are
   * inherently subjective — model answer is a grading reference, not an
   * exact-match target.
   */
  @Column({ type: 'text', nullable: true })
  modelAnswer: string | null;

  /** Reading passage, only populated for spoken_short_answer / reading-comprehension items. */
  @Column({ type: 'text', nullable: true })
  passage: string | null;

  /** How the user is expected to respond: typed text, or recorded audio. Defaults to 'text'. */
  @Column({ type: 'varchar', length: 10, default: 'text' })
  responseMode: ResponseMode;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @Column({ type: 'varchar', length: 20 })
  skill: PlacementSkill;

  /**
   * Continuous difficulty scale 1-10. Used for authoring/balancing the 3
   * sets against each other and for reporting — not for live selection.
   */
  @Column({ type: 'smallint' })
  difficulty: number;

  @Column({ type: 'varchar', length: 5 })
  cefrLevel: CefrLevel;

  @Column({ type: 'varchar', length: 100, nullable: true })
  topic: string; // e.g. 'present-perfect', 'phrasal-verbs', 'skimming'

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: QuestionStatus;

  /** Which fixed set this question belongs to: A, B, or C. */
  @Column({ type: 'varchar', length: 1 })
  setName: QuestionSet;

  /**
   * Fixed 1-based position within its set. This is what determines
   * playback order — questions are served in this order, not by difficulty
   * branching.
   */
  @Column({ type: 'smallint' })
  orderInSet: number;

  /**
   * Version pointer — when a question is edited, we don't mutate it in place.
   * We retire the old row and insert a new one carrying the same questionGroupId,
   * so past attempts still resolve to the exact wording/options they were shown.
   * See PlacementQuestionVersion note below.
   */
  @Column({ type: 'uuid', nullable: true })
  questionGroupId: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
