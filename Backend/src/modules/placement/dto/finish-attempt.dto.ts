import { IsNotEmpty, IsString } from 'class-validator';

export class FinishAttemptDto {
  @IsString()
  @IsNotEmpty()
  attemptId: string;
}
