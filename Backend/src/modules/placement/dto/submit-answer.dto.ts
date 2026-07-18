import { IsInt, IsNotEmpty, IsOptional, IsString, Min, Max } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  attemptId: string;

  @IsString()
  @IsNotEmpty()
  questionId: string;

  /** Required for MCQ questions. Omit for non-MCQ (fill_blank, spoken, etc.). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  selectedOptionIndex?: number;

  /** For non-MCQ questions: typed text, or a transcript of a recorded audio answer. */
  @IsOptional()
  @IsString()
  textResponse?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  responseTimeMs?: number;
}
