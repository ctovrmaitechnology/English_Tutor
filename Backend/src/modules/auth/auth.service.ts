import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: registerDto.email },
        { username: registerDto.username },
      ],
    });

    if (existingUser) {
      throw new ConflictException('Email or username already in use');
    }

    const password_hash = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      id: ulid(),
      first_name: registerDto.first_name,
      last_name: registerDto.last_name,
      username: registerDto.username,
      email: registerDto.email,
      character: registerDto.character,
      password_hash,
      is_active: true,
    });

    await this.userRepository.save(user);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      character: user.character,
    };
  }

  async login(loginDto: LoginDto) {
    const input = loginDto.username.trim().toLowerCase();
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash') // ← explicitly load it
      .where('LOWER(user.username) = :input OR LOWER(user.email) = :input', { input })
      .getOne();

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      character: user.character,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, is_active: true },
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      character: user.character,
      phone: user.phone,
    };
  }
}