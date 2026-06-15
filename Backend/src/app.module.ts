import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { VoiceModule } from './modules/voice/voice.module';
import { GamesModule } from './modules/games/games.module';
import { ChatModule } from './modules/chat/chat.module';
import { AssessmentModule } from './modules/assessment/assessment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        ssl: config.get<string>('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
        synchronize: true,
        logging: false,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: true,
      }),
    }),

    AuthModule,
    UsersModule,
    GeminiModule,
    VoiceModule,
    GamesModule,
    ChatModule,
    AssessmentModule,
  ],
})
export class AppModule {}