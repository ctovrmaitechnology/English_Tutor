import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({ example: 'elephant' })
  @IsString()
  answer: string;

  @ApiPropertyOptional({ example: 3200 })
  @IsOptional()
  @IsNumber()
  timeMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}