import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Arun' })
  @IsString()
  first_name: string;

  @ApiProperty({ example: 'Kumar' })
  @IsString()
  last_name: string;

  @ApiProperty({ example: 'arunkumar' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'arun@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Warrior' })
  @IsString()
  character: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;
}