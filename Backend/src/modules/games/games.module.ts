import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSession } from './entities/game-session.entity';

import { VocabularyController } from './vocabulary/vocabulary.controller';
import { VocabularyService } from './vocabulary/vocabulary.service';

import { GrammarController } from './grammar/grammar.controller';
import { GrammarService } from './grammar/grammar.service';

import { BpoController } from './bpo/bpo.controller';
import { BpoService } from './bpo/bpo.service';

import { StoryController } from './story/story.controller';
import { StoryService } from './story/story.service';

import { VoiceGamesController } from './voice/voice-games.controller';
import { VoiceGamesService } from './voice/voice-games.service';

import { DailyController } from './daily/daily.controller';
import { DailyService } from './daily/daily.service';



@Module({
  imports: [TypeOrmModule.forFeature([GameSession])],
  controllers: [
    VocabularyController,
    GrammarController,
    BpoController,
    StoryController,
    VoiceGamesController,
    DailyController,
  ],
  providers: [
    VocabularyService,
    GrammarService,
    BpoService,
    StoryService,
    VoiceGamesService,
    DailyService,
  ],
  exports: [
    VocabularyService,
    GrammarService,
    BpoService,
    StoryService,
    VoiceGamesService,
    DailyService,
  ],
})
export class GamesModule {}