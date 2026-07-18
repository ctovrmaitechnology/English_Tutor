import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GeminiModule } from './modules/gemini/gemini.module';
import { VoiceModule } from './modules/voice/voice.module';
import { GamesModule } from './modules/games/games.module';
import { ChatModule } from './modules/chat/chat.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { PlacementModule } from './modules/placement/placement.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 120, // 120 requests per minute
    }]),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<any> => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          const { redisStore } = await import('cache-manager-redis-yet');
          return {
            store: await redisStore({ url: redisUrl, ttl: 60000 }),
          };
        }
        return {
          ttl: 60000,
        };
      },
    }),

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
    PlacementModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}