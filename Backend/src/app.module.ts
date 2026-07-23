import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { VoiceModule } from './modules/voice/voice.module';
import { GamesModule } from './modules/games/games.module';
import { ChatModule } from './modules/chat/chat.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { AdminModule } from './modules/admin/admin.module';
import { CandidateRemarkModule } from './modules/remarks/candidate-remark.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { PlacementModule } from './modules/placement/placement.module';
import { SpeakingModule } from './modules/speaking/speaking.module';
import { WritingModule } from './modules/writing/writing.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { WeeklyModule } from './modules/Weekly/weekly.module';
import { PracticeModule } from './modules/practice/practice.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Enable cron scheduler for daily remark generation
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        synchronize: true,
        logging: false,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        extra: {
          max: 3,              // max 3 connections in pool
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        },
      }),
    }),

    AuthModule,
    UsersModule,
    GeminiModule,
    VoiceModule,
    GamesModule,
    ChatModule,
    AssessmentModule,
    AdminModule,
    CandidateRemarkModule,
    SessionsModule,
    PlacementModule,
    SpeakingModule,
    WritingModule,
    LessonModule,
    WeeklyModule,
    PracticeModule,
  ],
})
export class AppModule {}