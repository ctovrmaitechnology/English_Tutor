import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class AnswerItemDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsOptional()
  selectedOptionIndex?: number;

  @IsOptional()
  @IsString()
  textResponse?: string;
}

export class FinishAttemptDto {
  @IsString()
  @IsNotEmpty()
  attemptId: string;

  @IsOptional()
  @IsArray()
  answers?: AnswerItemDto[];
}
