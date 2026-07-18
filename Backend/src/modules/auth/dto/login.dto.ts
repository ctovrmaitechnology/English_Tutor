import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'arunkumar' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  password: string;
}