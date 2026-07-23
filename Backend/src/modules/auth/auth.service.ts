import { Injectable, OnModuleInit, Logger, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ulid } from 'ulid';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) { }

  async onModuleInit() {
    // Ensure at least one default admin account exists in the database
    try {
      const existingAdmin = await this.userRepository.findOne({
        where: [
          { username: 'admin' },
          { role: 'Admin' },
          { role: 'admin' },
        ],
      });

      if (!existingAdmin) {
        const password_hash = await bcrypt.hash('admin123', 10);
        const adminUser = this.userRepository.create({
          id: ulid(),
          first_name: 'System',
          last_name: 'Admin',
          username: 'admin',
          email: 'admin@vrm.com',
          character: 'warrior',
          password_hash,
          phone: '0000000000',
          is_active: true,
          role: 'Admin',
        });
        await this.userRepository.save(adminUser);
        this.logger.log('Default admin account created (username: admin / password: admin123)');
      }
    } catch (e) {
      this.logger.warn(`Could not seed default admin user: ${(e as any)?.message}`);
    }
  }

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
      character: registerDto.character || 'warrior',
      password_hash,
      phone: registerDto.phone,
      is_active: true,
      role: 'user',
    });

    await this.userRepository.save(user);
    return { message: 'Registration successful' };
  }

  async adminLogin(loginDto: LoginDto) {
    const input = (loginDto.username || '').trim();

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('LOWER(user.username) = LOWER(:input) OR LOWER(user.email) = LOWER(:input)', { input })
      .getOne();

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roleClean = (user.role || '').toLowerCase();
    const isAllowedRole = roleClean === 'admin' || roleClean === 'superadmin' || roleClean === 'trainer' || roleClean === 'team lead';

    if (!isAllowedRole) {
      throw new UnauthorizedException('Access denied. Admin privileges required.');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role || 'Admin',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role || 'Admin',
      },
    };
  }

  async login(loginDto: LoginDto) {
    const input = (loginDto.username || '').trim();

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('LOWER(user.username) = LOWER(:input) OR LOWER(user.email) = LOWER(:input)', { input })
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

    // Check if user has completed entry assessment
    let hasCompletedEntryTest = false;
    let placementLevel = null;
    try {
      const pTest = await this.userRepository.manager
        .createQueryBuilder()
        .select('level')
        .from('placement_tests', 'p')
        .where('p."userId" = :uid', { uid: userId })
        .orderBy('p."createdAt"', 'DESC')
        .limit(1)
        .getRawOne();

      if (pTest && pTest.level) {
        placementLevel = pTest.level;
      }
    } catch {
      hasCompletedEntryTest = false;
    }

    const cleanLevel = placementLevel ? placementLevel.trim().toUpperCase() : null;

    if (cleanLevel === 'BEGINNER' || cleanLevel === 'INTERMEDIATE') {
      hasCompletedEntryTest = true;
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      role: user.role,
      level: cleanLevel,
      character: (user as any).character || 'eva',
      phone: user.phone,
      hasCompletedEntryTest,
      isFirstLogin: !hasCompletedEntryTest,
      hasSelectedCharacter: !!(user as any).hasSelectedCharacter,
      entryLevel: cleanLevel ? cleanLevel.toLowerCase() : null,
    };
  }

  async updateCharacter(userId: string, character: string) {
    const validCharacters = ['eva', 'zap', 'tecci', 'buffy', 'shadow', 'nova', 'titan'];
    if (!validCharacters.includes(character)) {
      throw new ConflictException(`Invalid character. Must be one of: ${validCharacters.join(', ')}`);
    }
    await this.userRepository.update({ id: userId }, { character, hasSelectedCharacter: true } as any);
    return { success: true, character };
  }
}