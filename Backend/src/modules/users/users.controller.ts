import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user by ID' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findOneById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    // Remove sensitive information like password_hash before returning
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  @Get(':id/level')
  @ApiOperation({ summary: 'Get user by ID with their English level from placement assessment' })
  async getUserLevel(@Param('id') id: string) {
    return this.usersService.getUserWithLevel(id);
  }
}
