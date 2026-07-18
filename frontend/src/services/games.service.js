import api from './api';

export const gamesService = {
  // ── Overview ───────────────────────────────────────
  getCategories:    () => api.get('/games/categories'),
  getStats:         () => api.get('/games/stats'),
  getHistory:       (limit = 20) => api.get(`/games/history?limit=${limit}`),
  getPersonalBests: () => api.get('/games/personal-bests'),
  getLeaderboard:   () => api.get('/games/leaderboard'),
  getRecentActivity:() => api.get('/games/recent-activity'),

  // ── Vocabulary ─────────────────────────────────────
  vocabulary: {
    startWordChain:    (data) => api.post('/games/vocabulary/word-chain/start', data),
    playWordChain:     (id, data) => api.post(`/games/vocabulary/word-chain/${id}/turn`, data),

    startSynonymStorm: (data) => api.post('/games/vocabulary/synonym-storm/start', data),
    submitSynonymStorm:(id, data) => api.post(`/games/vocabulary/synonym-storm/${id}/submit`, data),

    startWordAmnesia:  (data) => api.post('/games/vocabulary/word-amnesia/start', data),
    answerWordAmnesia: (id, data) => api.post(`/games/vocabulary/word-amnesia/${id}/answer`, data),

    startSpeedRun:     (data) => api.post('/games/vocabulary/speed-run/start', data),
    answerSpeedRun:    (id, data) => api.post(`/games/vocabulary/speed-run/${id}/answer`, data),

    getPersonalBest:   () => api.get('/games/vocabulary/personal-best'),
  },

  // ── Grammar ────────────────────────────────────────
  grammar: {
    startGrammarNinja:    (data) => api.post('/games/grammar/grammar-ninja/start', data),
    answerGrammarNinja:   (id, data) => api.post(`/games/grammar/grammar-ninja/${id}/answer`, data),

    startSentenceSurgeon: (data) => api.post('/games/grammar/sentence-surgeon/start', data),
    answerSentenceSurgeon:(id, data) => api.post(`/games/grammar/sentence-surgeon/${id}/answer`, data),
    getHint:              (id) => api.get(`/games/grammar/sentence-surgeon/${id}/hint`),

    startErrorHunt:       (data) => api.post('/games/grammar/error-hunt/start', data),
    submitErrorHunt:      (id, data) => api.post(`/games/grammar/error-hunt/${id}/submit`, data),

    startTenseTransformer:(data) => api.post('/games/grammar/tense-transformer/start', data),
    answerTenseTransformer:(id, data) => api.post(`/games/grammar/tense-transformer/${id}/answer`, data),

    getPersonalBest:      () => api.get('/games/grammar/personal-best'),
  },

  // ── BPO ────────────────────────────────────────────
  bpo: {
    startAngryCustomer:  (data) => api.post('/games/bpo/angry-customer/start', data),
    replyAngryCustomer:  (id, data) => api.post(`/games/bpo/angry-customer/${id}/reply`, data),

    startEmailRace:      (data) => api.post('/games/bpo/email-race/start', data),
    submitEmailRace:     (id, data) => api.post(`/games/bpo/email-race/${id}/submit`, data),

    startHoldMusic:      (data) => api.post('/games/bpo/hold-music/start', data),
    answerHoldMusic:     (id, data) => api.post(`/games/bpo/hold-music/${id}/respond`, data),

    startJargonMaster:   (data) => api.post('/games/bpo/jargon-master/start', data),
    answerJargonMaster:  (id, data) => api.post(`/games/bpo/jargon-master/${id}/answer`, data),

    getPersonalBest:     () => api.get('/games/bpo/personal-best'),
  },

  // ── Story ──────────────────────────────────────────
  story: {
    startStoryBuilder:    (data) => api.post('/games/story/story-builder/start', data),
    continueStoryBuilder: (id, data) => api.post(`/games/story/story-builder/${id}/continue`, data),

    startNewsAnchor:      (data) => api.post('/games/story/news-anchor/start', data),
    submitNewsAnchor:     (id, data) => api.post(`/games/story/news-anchor/${id}/submit`, data),

    startJobInterview:    (data) => api.post('/games/story/job-interview/start', data),
    answerJobInterview:   (id, data) => api.post(`/games/story/job-interview/${id}/answer`, data),

    startDebateMe:        (data) => api.post('/games/story/debate-me/start', data),
    argueDebateMe:        (id, data) => api.post(`/games/story/debate-me/${id}/argue`, data),

    getPersonalBest:      () => api.get('/games/story/personal-best'),
  },

  // ── Voice ──────────────────────────────────────────
  voice: {
    startTongueTwister:  (data) => api.post('/games/voice/tongue-twister/start', data),
    submitTongueTwister: (id, formData) => api.post(
      `/games/voice/tongue-twister/${id}/submit`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),

    startEchoMaster:     (data) => api.post('/games/voice/echo-master/start', data),
    submitEchoMaster:    (id, formData) => api.post(
      `/games/voice/echo-master/${id}/submit`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),

    startAccentDrill:    (data) => api.post('/games/voice/accent-drill/start', data),
    submitAccentDrill:   (id, formData) => api.post(
      `/games/voice/accent-drill/${id}/submit`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),

    startSpeedSpeak:     (data) => api.post('/games/voice/speed-speak/start', data),
    submitSpeedSpeak:    (id, formData) => api.post(
      `/games/voice/speed-speak/${id}/submit`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),

    getPersonalBest:     () => api.get('/games/voice/personal-best'),
  },

  // ── Daily ──────────────────────────────────────────
  daily: {
    checkSpin:           () => api.get('/games/daily/spin/check'),
    spin:                () => api.post('/games/daily/spin'),
    getActiveReward:     () => api.get('/games/daily/spin/reward'),

    checkBoss:           () => api.get('/games/daily/boss/check'),
    startBoss:           () => api.post('/games/daily/boss/start'),
    replyBoss:           (id, data) => api.post(`/games/daily/boss/${id}/reply`, data),

    getStreakInfo:        () => api.get('/games/daily/streak-shield'),
    useShield:           () => api.post('/games/daily/streak-shield/use'),

    getTreasureHunt:     () => api.get('/games/daily/treasure-hunt'),
    unlockWord:          (activityType) => api.post(`/games/daily/treasure-hunt/unlock/${activityType}`),
  },
};