import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartGameDto {
  @ApiProperty({ example: 'WORD_CHAIN' })
  @IsString()
  gameType: string;

  @ApiProperty({ example: 'VOCABULARY' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 'BEGINNER' })
  @IsOptional()
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  difficulty?: string;
}