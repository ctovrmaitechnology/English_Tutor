import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SynthesizeDto {
  @ApiProperty({ example: 'Hello, welcome to customer support.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Text length cannot exceed 1000 characters for TTS synthesis.' })
  text: string;

  @ApiPropertyOptional({ example: 'af_heart', default: 'af_heart' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  voice?: string;

  @ApiPropertyOptional({ example: 1.1, default: 1.1 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  speed?: number;
}
