import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { is_active: true },
    });
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.findOneById(id);
    await this.userRepository.update(id, data);
    return this.findOneById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOneById(id);
    await this.userRepository.update(id, { is_active: false });
  }
}