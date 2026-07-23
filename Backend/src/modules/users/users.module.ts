import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PlacementAttempt } from '../placement/entities/placement-attempt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PlacementAttempt])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}