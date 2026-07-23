import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import { User } from '../users/user.entity';
import { ModuleProgress } from '../assessment/entities/module-progress.entity';
import { AssessmentAttempt } from '../assessment/entities/assessment-attempt.entity';
import { Certificate } from '../assessment/entities/certificate.entity';
import { SpeakingSession } from '../assessment/entities/speaking-session.entity';
import { GameSession } from '../games/entities/game-session.entity';
import { AttemptLesson } from '../lesson/entities/attempt-lesson.entity';
import { SessionsService } from '../sessions/sessions.service';

const MODULE_SECTIONS: Record<string, string[]> = {
  'sp-1': ['sp-1-1','sp-1-2','sp-1-3','sp-1-4','sp-1-5','sp-1-6','sp-1-7','sp-1-8','sp-1-9','sp-1-10','sp-1-11','sp-1-12','sp-1-13','sp-1-14','sp-1-15','sp-1-16'],
  'sp-2': ['sp-2-1','sp-2-2','sp-2-3','sp-2-4','sp-2-5','sp-2-6','sp-2-7','sp-2-8','sp-2-9','sp-2-10','sp-2-11','sp-2-12','sp-2-13','sp-2-14','sp-2-15','sp-2-16','sp-2-17','sp-2-18'],
  'sp-3': ['sp-3-1','sp-3-2','sp-3-3','sp-3-4','sp-3-5','sp-3-6','sp-3-7','sp-3-8','sp-3-9','sp-3-10','sp-3-11','sp-3-12','sp-3-13','sp-3-14','sp-3-15','sp-3-16','sp-3-17','sp-3-18'],
  'sp-4': ['sp-4-1','sp-4-2','sp-4-3','sp-4-4','sp-4-5','sp-4-6','sp-4-7','sp-4-8','sp-4-9','sp-4-10','sp-4-11','sp-4-12','sp-4-13'],
  'wr-1': Array.from({ length: 37 }, (_, i) => `wr-1-${i + 1}`),
  'wr-2': Array.from({ length: 40 }, (_, i) => `wr-2-${i + 1}`),
  'wr-3': Array.from({ length: 40 }, (_, i) => `wr-3-${i + 1}`),
  'wr-4': Array.from({ length: 35 }, (_, i) => `wr-4-${i + 1}`),
};
const MODULE_LABELS: Record<string, string> = {
  'sp-1':'Speaking & Listening Foundations','sp-2':'BPO Call Speaking',
  'sp-3':'Fluency & Confidence','sp-4':'Advanced Communication',
  'wr-1':'Grammar Foundations','wr-2':'Professional Emails',
  'wr-3':'Handling Complaints','wr-4':'Advanced Business Writing',
};
const SUBMODULE_LABELS: Record<string, string> = {
  // Speaking (65)
  'sp-1-1':'Greetings & Introducing Yourself','sp-1-2':'The Phonetic Alphabet for Spelling on Calls',
  'sp-1-3':'Numbers, Dates & Time','sp-1-4':'Simple Present Tense',
  'sp-1-5':'Simple Sentence Structure','sp-1-6':'Common Workplace & Everyday Vocabulary',
  'sp-1-7':'Asking Simple Questions','sp-1-8':'Describing People & Things',
  'sp-1-9':'Talking About Likes & Preferences','sp-1-10':'Simple Past Tense',
  'sp-1-11':'Polite Words','sp-1-12':'Basic Listening Practice',
  'sp-1-13':'Reading Simple Sentences Aloud','sp-1-14':'Common Beginner Mistakes',
  'sp-1-15':'Vocabulary Building','sp-1-16':'Simple Future Tense',

  'sp-2-1':'Formal vs Informal English','sp-2-2':'Word Stress Basics',
  'sp-2-3':'Professional Self-Introduction','sp-2-4':'Making Small Talk',
  'sp-2-5':'Office & Workplace Vocabulary','sp-2-6':'Expressing Opinions',
  'sp-2-7':'Agreeing & Disagreeing Politely','sp-2-8':'Making Requests Politely',
  'sp-2-9':'Professional Apologies','sp-2-10':'Present Continuous Tense',
  'sp-2-11':'Describing Problems & Situations','sp-2-12':'Telephone English Basics',
  'sp-2-13':'Asking for Clarification','sp-2-14':'Basic Customer Conversations',
  'sp-2-15':'Basic Email Communication','sp-2-16':'Workplace Listening Practice',
  'sp-2-17':'Common Grammar Mistakes at Work','sp-2-18':'Workplace Expressions',

  'sp-3-1':'First Impressions on Calls & Chats','sp-3-2':'Professional Call Opening Structure',
  'sp-3-3':'Active Listening','sp-3-4':'Understanding Customer Intent',
  'sp-3-5':'Probing Questions','sp-3-6':'Clarification Techniques',
  'sp-3-7':'Showing Empathy to Customers','sp-3-8':'Professional Response Framing (Saying No Politely)',
  'sp-3-9':'Speaking with Confidence on Calls','sp-3-10':'Clear Speech & Articulation',
  'sp-3-11':'Neutral Accent Awareness (MTI Basics)','sp-3-12':'Common Sound Corrections',
  'sp-3-13':'Word & Sentence Stress','sp-3-14':'Handling Simple Customer Complaints',
  'sp-3-15':'Call Documentation Basics','sp-3-16':'Professional Chat Etiquette',
  'sp-3-17':'Ending Calls & Chats Professionally','sp-3-18':'Cross-Cultural Communication Basics',

  'sp-4-1':'Handling Angry or Frustrated Customers','sp-4-2':'De-escalation Techniques',
  'sp-4-3':'Objection Handling','sp-4-4':'Conflict Resolution on Calls',
  'sp-4-5':'Hold & Transfer Etiquette','sp-4-6':'Escalation Procedures',
  'sp-4-7':'Advanced Call Flow Management','sp-4-8':'Global Accent Familiarity (US, UK & Australian)',
  'sp-4-9':'Fast, Natural Speech – Advanced Listening','sp-4-10':'Spontaneous Speaking – Thinking on Your Feet',
  'sp-4-11':'Advanced Vocabulary & Professional Expressions','sp-4-12':'Customer-Centric Thinking & First-Call Resolution',
  'sp-4-13':'Team Communication & Workplace Etiquette',

  // wr-1 (37)
  'wr-1-1':'Introduction to Workplace Writing','wr-1-2':'Why Writing Matters in Everyday Life & BPO',
  'wr-1-3':'Writing vs Speaking','wr-1-4':'Characteristics of Good Writing',
  'wr-1-5':'Subject, Verb & Object (SVO)','wr-1-6':'Sentence Formation',
  'wr-1-7':'Word Order','wr-1-8':'Types of Sentences',
  'wr-1-9':'Everyday Vocabulary','wr-1-10':'Workplace Vocabulary',
  'wr-1-11':'Nouns','wr-1-12':'Pronouns',
  'wr-1-13':'Verbs','wr-1-14':'Adjectives',
  'wr-1-15':'Adverbs','wr-1-16':'Articles (A, An, The)',
  'wr-1-17':'Prepositions','wr-1-18':'Conjunctions',
  'wr-1-19':'Subject–Verb Agreement','wr-1-20':'Simple Present Tense',
  'wr-1-21':'Present Continuous Tense','wr-1-22':'Simple Past Tense',
  'wr-1-23':'Simple Future Tense','wr-1-24':'Question Formation',
  'wr-1-25':'Negative Sentences','wr-1-26':'Capitalization',
  'wr-1-27':'Punctuation','wr-1-28':'Spelling Rules',
  'wr-1-29':'Common MTI Mistakes','wr-1-30':'Proofreading Basics',
  'wr-1-31':'Writing Simple Workplace Sentences','wr-1-32':'Self Introduction Writing',
  'wr-1-33':'Daily Routine Writing','wr-1-34':'Writing Simple Descriptions',
  'wr-1-35':'Writing Short Paragraphs','wr-1-36':'Filling Forms Correctly',
  'wr-1-37':'Writing Assessment',

  // wr-2 (40)
  'wr-2-1':'Professional Vocabulary','wr-2-2':'Positive Language',
  'wr-2-3':'Formal vs Informal Writing','wr-2-4':'Professional Tone',
  'wr-2-5':'Polite Expressions','wr-2-6':'Modal Verbs',
  'wr-2-7':'Quantifiers','wr-2-8':'Present Perfect Tense',
  'wr-2-9':'Past Continuous Tense','wr-2-10':'Past Perfect Tense',
  'wr-2-11':'Future Continuous Tense','wr-2-12':'Will vs Going To',
  'wr-2-13':'Linking Words','wr-2-14':'Cohesion',
  'wr-2-15':'Coherence','wr-2-16':'Topic Sentences',
  'wr-2-17':'Supporting Sentences','wr-2-18':'Concluding Sentences',
  'wr-2-19':'Request Messages','wr-2-20':'Reminder Messages',
  'wr-2-21':'Confirmation Messages','wr-2-22':'Thank You Messages',
  'wr-2-23':'Apology Messages','wr-2-24':'Leave Request Writing',
  'wr-2-25':'Follow-up Messages','wr-2-26':'Clarification Messages',
  'wr-2-27':'Email Structure','wr-2-28':'Subject Line Writing',
  'wr-2-29':'Greetings & Salutations','wr-2-30':'Email Body',
  'wr-2-31':'Professional Closing','wr-2-32':'Email Signature',
  'wr-2-33':'Email Etiquette','wr-2-34':'Introduction to Chat Writing',
  'wr-2-35':'Chat Etiquette','wr-2-36':'Greeting Customers',
  'wr-2-37':'Customer Verification','wr-2-38':'Customer Response Writing',
  'wr-2-39':'Closing Customer Chats','wr-2-40':'Writing Assessment',

  // wr-3 (40)
  'wr-3-1':'Business Email Writing','wr-3-2':'Professional Tone',
  'wr-3-3':'Customer Communication','wr-3-4':'Empathy Statements',
  'wr-3-5':'Ownership Statements','wr-3-6':'Active Voice',
  'wr-3-7':'Passive Voice','wr-3-8':'Direct & Indirect Speech',
  'wr-3-9':'Zero Conditional','wr-3-10':'First Conditional',
  'wr-3-11':'Complaint Email Writing','wr-3-12':'Refund Email Writing',
  'wr-3-13':'Apology & De-escalation Writing','wr-3-14':'Explaining Company Policies',
  'wr-3-15':'Offering Alternatives & Solutions','wr-3-16':'Live Chat Writing Structure',
  'wr-3-17':'Fast & Professional Chat Responses','wr-3-18':'Handling Difficult Customers in Chat',
  'wr-3-19':'CRM Ticket Notes Basics','wr-3-20':'Structuring Clear CRM Summaries',
  'wr-3-21':'Resolution Notes & Case Closing','wr-3-22':'Internal Escalation Notes',
  'wr-3-23':'Shift Handover Documentation','wr-3-24':'Meeting Notes',
  'wr-3-25':'Daily Status Reports','wr-3-26':'Business Reports',
  'wr-3-27':'Writing Clear Instructions','wr-3-28':'Process Documentation',
  'wr-3-29':'Editing Business Documents','wr-3-30':'Proofreading Business Documents',
  'wr-3-31':'Standard Response Templates','wr-3-32':'Knowledge Base Writing',
  'wr-3-33':'Customer Scenario Writing','wr-3-34':'Email Simulation',
  'wr-3-35':'Chat Simulation','wr-3-36':'CRM Simulation',
  'wr-3-37':'Workplace Documentation Practice','wr-3-38':'AI Business Writing',
  'wr-3-39':'Integrated Business Writing','wr-3-40':'Writing Assessment',

  // wr-4 (35)
  'wr-4-1':'Advanced Customer Communication','wr-4-2':'Complaint Resolution',
  'wr-4-3':'Escalation Management','wr-4-4':'Conflict Resolution',
  'wr-4-5':'Customer Retention Communication','wr-4-6':'Advanced Modal Verbs',
  'wr-4-7':'Second Conditional','wr-4-8':'Advanced Sentence Variety',
  'wr-4-9':'Advanced Linking Devices','wr-4-10':'Persuasive Writing',
  'wr-4-11':'Writing Standard Operating Procedures (SOPs)','wr-4-12':'SOP Formatting & Checklist Design',
  'wr-4-13':'Compliance & Policy Documentation','wr-4-14':'Regulatory & Legal Notice Writing',
  'wr-4-15':'Incident Report Writing','wr-4-16':'Security & Data Privacy Documentation',
  'wr-4-17':'Timed Email Writing Drills','wr-4-18':'Timed Chat Response Drills',
  'wr-4-19':'Timed Escalation Summary Drills','wr-4-20':'Speed & Accuracy under SLA Pressure',
  'wr-4-21':'Multi-Channel Support Communication','wr-4-22':'Handling Multiple Simultaneous Chats',
  'wr-4-23':'High-Priority Customer Cases','wr-4-24':'Complex Customer Scenarios',
  'wr-4-25':'End-to-End Customer Journey Writing','wr-4-26':'Documentation Audit',
  'wr-4-27':'Quality Audit Writing','wr-4-28':'Root Cause Analysis Writing',
  'wr-4-29':'Professional Report Writing','wr-4-30':'Executive Summary Writing',
  'wr-4-31':'Production Email Simulation','wr-4-32':'Production Chat Simulation',
  'wr-4-33':'Production Documentation','wr-4-34':'Multi-task Writing',
  'wr-4-35':'Writing Assessment',
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ModuleProgress)
    private readonly moduleProgressRepo: Repository<ModuleProgress>,
    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepo: Repository<AssessmentAttempt>,
    @InjectRepository(Certificate)
    private readonly certRepo: Repository<Certificate>,
    @InjectRepository(SpeakingSession)
    private readonly speakingRepo: Repository<SpeakingSession>,
    @InjectRepository(GameSession)
    private readonly gameRepo: Repository<GameSession>,
    @InjectRepository(AttemptLesson)
    private readonly lessonAttemptRepo: Repository<AttemptLesson>,
    private readonly sessionsService: SessionsService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private weekStart(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private monthRange(monthsAgo: number) {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  private scorePercent(raw: number, outOf = 30): number {
    return Math.round((raw / outOf) * 100);
  }

  // Compute streaks for ALL users in ONE query
  private async computeAllStreaks(userIds: string[]): Promise<Record<string, number>> {
    if (!userIds.length) return {};

    const rows = await this.gameRepo
      .createQueryBuilder('g')
      .select('g."userId"', 'userId')
      .addSelect('DATE(g."startedAt")', 'day')
      .where('g."userId" IN (:...ids)', { ids: userIds })
      .groupBy('g."userId"', )
      .addGroupBy('DATE(g."startedAt")')
      .orderBy('g."userId"')
      .addOrderBy('day', 'DESC')
      .getRawMany();

    // Group by userId
    const byUser: Record<string, string[]> = {};
    for (const r of rows) {
      if (!byUser[r.userId]) byUser[r.userId] = [];
      byUser[r.userId].push(r.day);
    }

    const streaks: Record<string, number> = {};
    for (const userId of userIds) {
      const days = byUser[userId] || [];
      if (!days.length) { streaks[userId] = 0; continue; }
      let streak = 0;
      let current = new Date();
      current.setHours(0, 0, 0, 0);
      for (const d of days) {
        const day = new Date(d);
        day.setHours(0, 0, 0, 0);
        const diff = Math.round((current.getTime() - day.getTime()) / 86400000);
        if (diff <= 1) { streak++; current = day; }
        else break;
      }
      streaks[userId] = streak;
    }
    return streaks;
  }

  // ── Overview Stats — 6 bulk queries total ─────────────────────────────────

  async getOverviewStats() {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // Run all independent queries in parallel
    const [totalUsers, activeUsers, totalCertificates, weeklyRaw, monthlyRaw, spkTrendRaw, wrtTrendRaw] =
      await Promise.all([
        this.userRepo.count({ where: { deleted_at: null } }),
        this.userRepo.count({ where: { is_active: true, deleted_at: null } }),
        this.certRepo.count(),

        // Weekly logins — single query grouped by day
        this.userRepo
          .createQueryBuilder('u')
          .select("TO_CHAR(u.updated_at, 'YYYY-MM-DD')", 'day')
          .addSelect('COUNT(*)', 'count')
          .where('u.updated_at >= :start', { start: new Date(Date.now() - 7 * 86400000) })
          .andWhere('u.deleted_at IS NULL')
          .groupBy("TO_CHAR(u.updated_at, 'YYYY-MM-DD')")
          .getRawMany(),

        // Monthly usage — single query grouped by month
        this.gameRepo
          .createQueryBuilder('g')
          .select("TO_CHAR(g.\"startedAt\", 'YYYY-MM')", 'month')
          .addSelect('COALESCE(SUM(g.duration), 0)', 'total')
          .where('g."startedAt" >= :start', { start: new Date(Date.now() - 180 * 86400000) })
          .groupBy("TO_CHAR(g.\"startedAt\", 'YYYY-MM')")
          .getRawMany(),

        // Speaking skill trend — single query grouped by week
        this.speakingRepo
          .createQueryBuilder('s')
          .select("DATE_TRUNC('week', s.created_at)", 'week')
          .addSelect('COALESCE(AVG(s.final_score), 0)', 'avg')
          .where('s.created_at >= :start AND s.completed = true', { start: new Date(Date.now() - 42 * 86400000) })
          .groupBy("DATE_TRUNC('week', s.created_at)")
          .orderBy('week', 'ASC')
          .getRawMany(),

        // Writing skill trend — single query grouped by week
        this.lessonAttemptRepo
          .createQueryBuilder('a')
          .select("DATE_TRUNC('week', a.created_at)", 'week')
          .addSelect('COALESCE(AVG(a.overall_score), 0)', 'avg')
          .where('a.created_at >= :start AND (a.module_id LIKE :cat OR a.lesson_id LIKE :cat)', { start: new Date(Date.now() - 42 * 86400000), cat: 'wr-%' })
          .groupBy("DATE_TRUNC('week', a.created_at)")
          .orderBy('week', 'ASC')
          .getRawMany(),
      ]);

    // Build weeklyLogins array
    const loginMap: Record<string, number> = {};
    for (const r of weeklyRaw) loginMap[r.day] = Number(r.count);
    const weeklyLogins = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      return { day: DAYS[d.getDay()], logins: loginMap[key] || 0 };
    });

    // Build monthlyUsage array
    const usageMap: Record<string, number> = {};
    for (const r of monthlyRaw) usageMap[r.month] = Math.round(Number(r.total) / 3600);
    const monthlyUsage = Array.from({ length: 6 }, (_, i) => {
      const { start } = this.monthRange(5 - i);
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      return { month: MONTHS[start.getMonth()], hours: usageMap[key] || 0 };
    });

    // Build skillTrend array
    const spkMap: Record<string, number> = {};
    for (const r of spkTrendRaw) spkMap[new Date(r.week).toISOString()] = Math.round(Number(r.avg));
    const wrtMap: Record<string, number> = {};
    for (const r of wrtTrendRaw) wrtMap[new Date(r.week).toISOString()] = Math.round(Number(r.avg));
    const skillTrend = Array.from({ length: 6 }, (_, i) => ({
      week: `W${i + 1}`,
      speaking: spkMap[Object.keys(spkMap)[i]] || 0,
      writing:  wrtMap[Object.keys(wrtMap)[i]]  || 0,
    }));

    return { totalUsers, activeUsers, inactiveUsers: totalUsers - activeUsers, totalCertificates, weeklyLogins, monthlyUsage, skillTrend };
  }

  // ── User Activity — 6 bulk queries for ALL users ───────────────────────────

  async getUserActivity() {
    const users = await this.userRepo.find({ where: { deleted_at: null }, order: { created_at: 'DESC' } });
    if (!users.length) return { users: [], avgUsage: 0, avgAiTutor: 0, avgSessionLen: 0, topStreak: 0 };

    const ids = users.map(u => u.id);

    // Get real session stats (total platform time + AI tutor time)
    const sessionStats = await this.sessionsService.getAllUserStats();

    // Remaining bulk queries in parallel
    const [modulesRaw, certsRaw, attemptsRaw, streaks, recentSessionsRaw] =
      await Promise.all([
        // Modules done per user
        this.moduleProgressRepo.createQueryBuilder('mp')
          .select('mp.user_id', 'userId')
          .addSelect('COUNT(*)', 'count')
          .where('mp.user_id IN (:...ids) AND mp.completed = true', { ids })
          .groupBy('mp.user_id')
          .getRawMany(),

        // Certificates per user
        this.certRepo.createQueryBuilder('c')
          .select('c.user_id', 'userId')
          .addSelect('COUNT(*)', 'count')
          .where('c.user_id IN (:...ids)', { ids })
          .groupBy('c.user_id')
          .getRawMany(),

        // Latest assessment score per user - use subquery approach
        this.lessonAttemptRepo.createQueryBuilder('a')
          .select('a.user_id', 'userId')
          .addSelect('MAX(a.created_at)', 'maxDate')
          .where('a.user_id IN (:...ids)', { ids })
          .groupBy('a.user_id')
          .getRawMany().then(async (maxDates) => {
            if (!maxDates.length) return [];
            const results = await Promise.all(maxDates.map(r =>
              this.lessonAttemptRepo.createQueryBuilder('a')
                .select('a.user_id', 'userId')
                .addSelect('a.overall_score', 'score')
                .where('a.user_id = :uid AND a.created_at = :date', { uid: r.userId, date: r.maxDate })
                .getRawOne()
            ));
            return results.filter(Boolean);
          }),

        // Streaks — all users in one query
        this.computeAllStreaks(ids),

        // Recent sessions — all users, last 10 each
        this.gameRepo.createQueryBuilder('g')
          .select(['g.id', 'g.userId', 'g.gameType', 'g.category', 'g.score', 'g.maxScore', 'g.accuracy', 'g.xpEarned', 'g.duration', 'g.completed', 'g.startedAt', 'g.completedAt'])
          .where('g."userId" IN (:...ids)', { ids })
          .orderBy('g."startedAt"', 'DESC')
          .limit(100)
          .getMany(),
      ]);

    // Build lookup maps
    const modulesMap:    Record<string, number> = {};
    const certsMap:      Record<string, number> = {};
    const attemptsMap:   Record<string, number> = {};
    const sessionsMap:   Record<string, any[]>  = {};

    for (const r of modulesRaw)    modulesMap[r.userId]  = Number(r.count);
    for (const r of certsRaw)      certsMap[r.userId]    = Number(r.count);
    for (const r of attemptsRaw)   attemptsMap[r.userId] = this.scorePercent(Number(r.score));
    for (const s of recentSessionsRaw) {
      if (!sessionsMap[s.userId]) sessionsMap[s.userId] = [];
      if (sessionsMap[s.userId].length < 10) sessionsMap[s.userId].push(s);
    }

    const activity = users.map(u => {
      const stats = sessionStats[u.id] || { totalUsageMins: 0, totalAiTutorMins: 0, sessionCount: 0, avgSessionMins: 0 };
      return {
        id:             u.id,
        name:           `${u.first_name} ${u.last_name}`,
        email:          u.email,
        username:       u.username,
        batch:          u.batch  ?? '—',
        role:           u.role   ?? 'Agent',
        entryLevel:     (u as any).entryLevel || 'beginner',
        status:         u.is_active ? 'active' : 'inactive',
        joinDate:       u.created_at,
        lastLogin:      u.updated_at,
        totalUsage:     stats.totalUsageMins,
        avgSessionMins: stats.avgSessionMins,
        aiTutorMins:    stats.totalAiTutorMins,
        modulesDone:    modulesMap[u.id]  || 0,
        assessmentScore:attemptsMap[u.id] || 0,
        streak:         streaks[u.id]     || 0,
        certificates:   certsMap[u.id]   || 0,
        recentSessions: sessionsMap[u.id] || [],
      };
    });

    const avgUsage      = activity.length ? Math.round(activity.reduce((s, u) => s + u.totalUsage,     0) / activity.length) : 0;
    const avgAiTutor    = activity.length ? Math.round(activity.reduce((s, u) => s + u.aiTutorMins,    0) / activity.length) : 0;
    const avgSessionLen = activity.length ? Math.round(activity.reduce((s, u) => s + u.avgSessionMins, 0) / activity.length) : 0;
    const topStreak     = activity.reduce((m, u) => Math.max(m, u.streak), 0);

    return { users: activity, avgUsage, avgAiTutor, avgSessionLen, topStreak };
  }

  // FIX 9: Session history per user — already fast (single user)
  async getUserSessionHistory(userId: string) {
    const [gameSessions, speakingSessions, moduleActivity] = await Promise.all([
      this.gameRepo.find({ where: { userId }, order: { startedAt: 'DESC' }, take: 50 }),
      this.speakingRepo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 20 }),
      this.moduleProgressRepo.find({ where: { userId }, order: { completedAt: 'DESC' } }),
    ]);
    return {
      gameSessions,
      speakingSessions,
      moduleActivity,
      totalGameSessions: gameSessions.length,
      totalSpeakingSessions: speakingSessions.length,
      totalModulesCompleted: moduleActivity.filter(m => m.completed).length,
    };
  }

  // ── Learning Progress — 4 bulk queries ────────────────────────────────────

  async getLearningProgress() {
    const ALL_KNOWN_SUBMODULE_IDS = new Set(Object.values(MODULE_SECTIONS).flat());
    const users = await this.userRepo.find({ where: { deleted_at: null } });
    const ids   = users.map(u => u.id);

    const moduleIds = ['sp-1','sp-2','sp-3','sp-4','wr-1','wr-2','wr-3','wr-4'];

    const [moduleProgressRaw, userModulesRaw, certsRaw, attemptsRaw] = await Promise.all([
      // Module-level completion counts
      this.moduleProgressRepo.createQueryBuilder('mp')
        .select('mp.module_id', 'moduleId')
        .addSelect('COUNT(DISTINCT mp.user_id)', 'completed')
        .where('mp.module_id IN (:...ids) AND mp.completed = true', { ids: moduleIds })
        .groupBy('mp.module_id')
        .getRawMany(),

      // Per-user module counts directly from attempt_lessons table
      this.lessonAttemptRepo.createQueryBuilder('la')
        .select('la.user_id', 'userId')
        .addSelect('COALESCE(la.lesson_id, la.module_id)', 'subId')
        .where('la.user_id IN (:...ids) AND (la.status = :st OR la.overall_score > 0)', { ids: ids.length ? ids : ['none'], st: 'completed' })
        .getRawMany(),
      
      // Certs per user with details
      this.certRepo.createQueryBuilder('c')
        .where('c.user_id IN (:...ids)', { ids: ids.length ? ids : ['none'] })
        .orderBy('c.created_at', 'DESC')
        .getMany(),

      // Latest attempt per user
      this.attemptRepo.createQueryBuilder('a')
        .select('a.user_id', 'userId')
        .addSelect('MAX(a.created_at)', 'maxDate')
        .where('a.user_id IN (:...ids)', { ids: ids.length ? ids : ['none'] })
        .groupBy('a.user_id')
        .getRawMany().then(async (maxDates) => {
          if (!maxDates.length) return [];
          const results = await Promise.all(maxDates.map(r =>
            this.attemptRepo.createQueryBuilder('a')
              .select('a.user_id', 'userId').addSelect('a.score', 'score')
              .where('a.user_id = :uid AND a.created_at = :date', { uid: r.userId, date: r.maxDate })
              .getRawOne()
          ));
          return results.filter(Boolean);
        }),
    ]);

    // Build maps
    const completedMap: Record<string, number> = {};
    for (const r of moduleProgressRaw) completedMap[r.moduleId] = Number(r.completed);

    const userSpkMap: Record<string, number> = {};
    const userWrtMap: Record<string, number> = {};
    const userTotalMap: Record<string, number> = {};

    const userCompletedSubSet = new Map<string, Set<string>>();
    for (const r of userModulesRaw) {
      const uid = r.userId;
      const subId = r.subId;
      if (!subId || !ALL_KNOWN_SUBMODULE_IDS.has(subId)) continue;

      if (!userCompletedSubSet.has(uid)) userCompletedSubSet.set(uid, new Set());
      userCompletedSubSet.get(uid).add(subId);
    }

    userCompletedSubSet.forEach((subSet, uid) => {
      let spk = 0;
      let wrt = 0;
      subSet.forEach(sId => {
        if (sId.startsWith('sp-')) spk++;
        else if (sId.startsWith('wr-')) wrt++;
      });
      userSpkMap[uid] = spk;
      userWrtMap[uid] = wrt;
      userTotalMap[uid] = subSet.size;
    });

    const certsByUser: Record<string, any[]> = {};
    const certCountMap: Record<string, number> = {};
    for (const c of certsRaw) {
      if (!certsByUser[c.userId]) certsByUser[c.userId] = [];
      certsByUser[c.userId].push(c);
      certCountMap[c.userId] = (certCountMap[c.userId] || 0) + 1;
    }

    const attemptMap: Record<string, number> = {};
    for (const r of attemptsRaw) attemptMap[r.userId] = this.scorePercent(Number(r.score));

    const moduleProgress = moduleIds.map(moduleId => {
      const completed  = completedMap[moduleId] || 0;
      const notStarted = Math.max(0, users.length - completed);
      return { module: moduleId.toUpperCase(), completed, inProgress: 0, notStarted };
    });

    const userProgress = users.map(u => ({
      id:             u.id,
      name:           `${u.first_name} ${u.last_name}`,
      batch:          u.batch ?? '—',
      status:         u.is_active ? 'active' : 'inactive',
      modulesDone:    userTotalMap[u.id] || 0,
      speakingPct:    Math.round(((userSpkMap[u.id] || 0) / 4) * 100),
      writingPct:     Math.round(((userWrtMap[u.id] || 0) / 4) * 100),
      certificates:   certCountMap[u.id] || 0,
      assessmentScore: attemptMap[u.id]  || 0,
    }));

    const certSummary = users.map(u => ({
      id:             u.id,
      name:           `${u.first_name} ${u.last_name}`,
      batch:          u.batch ?? '—',
      certificates:   certsByUser[u.id] || [],
      certCount:      certCountMap[u.id] || 0,
      assessmentScore: attemptMap[u.id] || 0,
      status:         u.is_active ? 'active' : 'inactive',
    }));

    const totalCerts    = certsRaw.length;
    const speakingCerts = certsRaw.filter(c => c.category === 'speaking').length;
    const writingCerts  = certsRaw.filter(c => c.category === 'writing').length;

    return {
      moduleProgress,
      userProgress,
      certSummary,
      certStats: { totalCerts, speakingCerts, writingCerts, usersWithCerts: certSummary.filter(u => u.certCount > 0).length },
    };
  }

  // ── Assessment Analytics — 4 bulk queries ─────────────────────────────────

  async getAssessmentAnalytics() {
    const users  = await this.userRepo.find({ where: { deleted_at: null } });
    const ids    = users.map(u => u.id);
    const weekAgo = this.weekStart();

    const [firstAttempts, lastAttempts, weeklyAttempts, weeklyModules, spkTrend, wrtTrend] = await Promise.all([
      // First (entry) attempt per user
      this.attemptRepo.createQueryBuilder('a')
        .select('a.user_id', 'userId').addSelect('MIN(a.created_at)', 'minDate')
        .where('a.user_id IN (:...ids)', { ids: ids.length ? ids : ['none'] })
        .groupBy('a.user_id').getRawMany().then(async (minDates) => {
          if (!minDates.length) return [];
          const results = await Promise.all(minDates.map(r =>
            this.attemptRepo.createQueryBuilder('a')
              .select('a.user_id', 'userId').addSelect('a.score', 'score')
              .where('a.user_id = :uid AND a.created_at = :date', { uid: r.userId, date: r.maxDate })
              .getRawOne()
          ));
          return results.filter(Boolean);
        }),

      // Latest attempt per user
      this.attemptRepo.createQueryBuilder('a')
        .select('a.user_id', 'userId').addSelect('MAX(a.created_at)', 'maxDate')
        .where('a.user_id IN (:...ids)', { ids: ids.length ? ids : ['none'] })
        .groupBy('a.user_id').getRawMany().then(async (maxDates) => {
          if (!maxDates.length) return [];
          const results = await Promise.all(maxDates.map(r =>
            this.attemptRepo.createQueryBuilder('a')
              .select('a.user_id', 'userId').addSelect('a.score', 'score')
              .where('a.user_id = :uid AND a.created_at = :date', { uid: r.userId, date: r.maxDate })
              .getRawOne()
          ));
          return results.filter(Boolean);
        }),

      // Weekly attempt per user
      this.attemptRepo.createQueryBuilder('a')
        .select('a.user_id', 'userId').addSelect('MAX(a.created_at)', 'maxDate')
        .where('a.user_id IN (:...ids) AND a.created_at >= :weekAgo', { ids: ids.length ? ids : ['none'], weekAgo })
        .groupBy('a.user_id').getRawMany().then(async (maxDates) => {
          if (!maxDates.length) return [];
          const results = await Promise.all(maxDates.map(r =>
            this.attemptRepo.createQueryBuilder('a')
              .select('a.user_id', 'userId').addSelect('a.score', 'score')
              .where('a.user_id = :uid AND a.created_at = :date', { uid: r.userId, date: r.maxDate })
              .getRawOne()
          ));
          return results.filter(Boolean);
        }),

      // Modules studied this week per user
      this.moduleProgressRepo.createQueryBuilder('mp')
        .select('mp.user_id', 'userId')
        .addSelect('mp.module_id', 'moduleId')
        .where('mp.user_id IN (:...ids) AND mp.completed = true AND mp.completed_at >= :weekAgo', { ids: ids.length ? ids : ['none'], weekAgo })
        .getRawMany(),

      // Speaking skill trend
      this.speakingRepo.createQueryBuilder('s')
        .select("DATE_TRUNC('week', s.created_at)", 'week')
        .addSelect('COALESCE(AVG(s.final_score), 0)', 'avg')
        .where('s.created_at >= :start AND s.completed = true', { start: new Date(Date.now() - 42 * 86400000) })
        .groupBy("DATE_TRUNC('week', s.created_at)").orderBy('week', 'ASC')
        .getRawMany(),

      // Writing skill trend
      this.attemptRepo.createQueryBuilder('a')
        .select("DATE_TRUNC('week', a.created_at)", 'week')
        .addSelect('COALESCE(AVG(a.score / 30.0 * 100), 0)', 'avg')
        .where('a.created_at >= :start AND a.category = :cat', { start: new Date(Date.now() - 42 * 86400000), cat: 'writing' })
        .groupBy("DATE_TRUNC('week', a.created_at)").orderBy('week', 'ASC')
        .getRawMany(),
    ]);

    const firstMap:   Record<string, number> = {};
    const lastMap:    Record<string, number> = {};
    const weeklyMap:  Record<string, number> = {};
    const weekModMap: Record<string, string[]> = {};

    for (const r of firstAttempts)  firstMap[r.userId]  = this.scorePercent(Number(r.score));
    for (const r of lastAttempts)   lastMap[r.userId]   = this.scorePercent(Number(r.score));
    for (const r of weeklyAttempts) weeklyMap[r.userId] = this.scorePercent(Number(r.score));
    for (const r of weeklyModules) {
      if (!weekModMap[r.userId]) weekModMap[r.userId] = [];
      weekModMap[r.userId].push(r.moduleId);
    }

    const userScores = users.map(u => {
      const entryScore  = firstMap[u.id]  || 0;
      const moduleScore = lastMap[u.id]   || 0;
      const weeklyScore = weeklyMap[u.id] ?? moduleScore;
      const studied     = weekModMap[u.id] || [];
      return {
        id: u.id, name: u.first_name, fullName: `${u.first_name} ${u.last_name}`,
        batch: u.batch ?? '—', entryScore, moduleScore, weeklyScore,
        growth: moduleScore - entryScore, passed: moduleScore >= 70,
        studiedModulesThisWeek: [...new Set(studied)],
        weeklyAssessmentBased: studied.length ? `Based on: ${[...new Set(studied)].join(', ')}` : 'No modules studied this week',
        status: u.is_active ? 'active' : 'inactive',
      };
    });

    const skillTrend = Array.from({ length: 6 }, (_, i) => ({
      week: `W${i + 1}`,
      speaking: Math.round(Number(spkTrend[i]?.avg) || 0),
      writing:  Math.round(Number(wrtTrend[i]?.avg)  || 0),
    }));

    const avgEntry  = userScores.length ? Math.round(userScores.reduce((s, u) => s + u.entryScore,  0) / userScores.length) : 0;
    const avgModule = userScores.length ? Math.round(userScores.reduce((s, u) => s + u.moduleScore, 0) / userScores.length) : 0;
    const avgWeekly = userScores.length ? Math.round(userScores.reduce((s, u) => s + u.weeklyScore, 0) / userScores.length) : 0;
    const top = userScores.reduce((b, u) => u.moduleScore > (b?.moduleScore ?? -1) ? u : b, null as typeof userScores[0] | null);

    return { userScores, skillTrend, summary: { avgEntry, avgModule, avgWeekly, topPerformer: top?.fullName ?? '—' } };
  }

  // ── Organisation Reports — 5 bulk queries ─────────────────────────────────

  async getOrgReports() {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const users  = await this.userRepo.find({ where: { deleted_at: null } });
    const ids    = users.map(u => u.id);

    const [totalModulesDone, totalHoursRaw, allAttemptsRaw, completionTrendRaw, gameUsageRaw] = await Promise.all([
      this.moduleProgressRepo.count({ where: { completed: true } }),

      this.gameRepo.createQueryBuilder('g')
        .select('COALESCE(SUM(g.duration), 0)', 'total').getRawOne(),

      this.attemptRepo.createQueryBuilder('a')
        .select('a.user_id', 'userId').addSelect('a.score', 'score').addSelect('a.created_at', 'createdAt')
        .orderBy('a.user_id').addOrderBy('a.created_at', 'ASC')
        .getRawMany(),

      this.moduleProgressRepo.createQueryBuilder('mp')
        .select("TO_CHAR(mp.completed_at, 'YYYY-MM')", 'month')
        .addSelect('COUNT(*)', 'count')
        .where('mp.completed = true')
        .groupBy("TO_CHAR(mp.completed_at, 'YYYY-MM')")
        .getRawMany(),

      this.gameRepo.createQueryBuilder('g')
        .select('g.category', 'category').addSelect('COUNT(*)', 'count')
        .groupBy('g.category').getRawMany(),
    ]);

    const totalUsers    = users.length;
    const activeUsers   = users.filter(u => u.is_active).length;
    const maxPossible   = totalUsers * 8;
    const completionRate = maxPossible > 0 ? Math.round((totalModulesDone / maxPossible) * 100) : 0;
    const totalTrainingHours = Math.round((Number(totalHoursRaw?.total) || 0) / 3600);

    // Avg improvement
    const userFL: Record<string, { first: number; last: number }> = {};
    for (const r of allAttemptsRaw) {
      const pct = this.scorePercent(Number(r.score));
      if (!userFL[r.userId]) userFL[r.userId] = { first: pct, last: pct };
      else userFL[r.userId].last = pct;
    }
    const improvements   = Object.values(userFL).map(v => v.last - v.first);
    const avgImprovement = improvements.length ? Math.round(improvements.reduce((s, v) => s + v, 0) / improvements.length) : 0;

    // Completion trend
    const trendMap: Record<string, number> = {};
    for (const r of completionTrendRaw) trendMap[r.month] = Number(r.count);
    let cumulative = 0;
    const completionTrend = Array.from({ length: 6 }, (_, i) => {
      const { start } = this.monthRange(5 - i);
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      cumulative += trendMap[key] || 0;
      return { month: MONTHS[start.getMonth()], rate: maxPossible > 0 ? Math.min(100, Math.round((cumulative / maxPossible) * 100)) : 0 };
    });

    const featureUsage = [
      ...gameUsageRaw.map(g => ({ name: g.category, value: Number(g.count) })),
      { name: 'Learning Modules', value: totalModulesDone },
    ];

    // Batch reports — group users by batch
    const batches = [...new Set(users.map(u => u.batch).filter(Boolean))].sort();
    const batchReports = await Promise.all(batches.map(async (batch) => {
      const batchUsers  = users.filter(u => u.batch === batch);
      const batchIds    = batchUsers.map(u => u.id);
      const batchActive = batchUsers.filter(u => u.is_active).length;

      if (!batchIds.length) return { batch, total: 0, active: 0, inactive: 0, adoptionRate: '0%', avgScore: '0%', modulesCompleted: 0, certificates: 0, completionRate: '0%' };

      const [batchModules, batchAvgScore, batchCerts] = await Promise.all([
        this.moduleProgressRepo.count({ where: { completed: true } }),
        this.attemptRepo.createQueryBuilder('a')
          .select('COALESCE(AVG(a.score / 30.0 * 100), 0)', 'avg')
          .where('a.user_id IN (:...ids)', { ids: batchIds }).getRawOne(),
        this.certRepo.createQueryBuilder('c')
          .select('COUNT(*)', 'count')
          .where('c.user_id IN (:...ids)', { ids: batchIds }).getRawOne(),
      ]);

      const batchMax = batchUsers.length * 8;
      return {
        batch,
        total:          batchUsers.length,
        active:         batchActive,
        inactive:       batchUsers.length - batchActive,
        adoptionRate:   `${batchUsers.length > 0 ? Math.round((batchActive / batchUsers.length) * 100) : 0}%`,
        avgScore:       `${Math.round(Number(batchAvgScore?.avg) || 0)}%`,
        modulesCompleted: Number(batchModules),
        certificates:   Number(batchCerts?.count) || 0,
        completionRate: `${batchMax > 0 ? Math.min(100, Math.round((Number(batchModules) / batchMax) * 100)) : 0}%`,
      };
    }));

    return {
      summary: { totalUsers, activeUsers, inactiveUsers: totalUsers - activeUsers, completionRate, totalTrainingHours, avgImprovement },
      completionTrend,
      featureUsage,
      batchReports,
    };
  }

  // ── PowerBI KPIs ───────────────────────────────────────────────────────────

  async getPowerBiKpis() {
    const [org, overview, totalCerts, avgAiMins] = await Promise.all([
      this.getOrgReports(),
      this.getOverviewStats(),
      this.certRepo.count(),
      this.speakingRepo.createQueryBuilder('s')
        .select('COALESCE(AVG(EXTRACT(EPOCH FROM (s.created_at - s.created_at))/60), 0)', 'avg')
        .where('s.completed = true').getRawOne(),
    ]);

    const adoptionRate = org.summary.totalUsers > 0
      ? Math.round((org.summary.activeUsers / org.summary.totalUsers) * 100)
      : 0;

    return {
      kpis: [
        { label: 'Avg Score Improvement',  value: `+${org.summary.avgImprovement}%`, sub: 'Entry vs Latest Assessment',         color: '#6366f1' },
        { label: 'Platform Adoption Rate', value: `${adoptionRate}%`,                sub: `${org.summary.activeUsers} of ${org.summary.totalUsers} users active`, color: '#10b981' },
        { label: 'Avg AI Tutor Usage',     value: `${Math.round(Number(avgAiMins?.avg) || 0)} min`, sub: 'Per completed session', color: '#8b5cf6' },
        { label: 'Module Completion Rate', value: `${org.summary.completionRate}%`,  sub: 'Across all users',                   color: '#3b82f6' },
        { label: 'Certificates Issued',    value: String(totalCerts),               sub: 'Total across all users',             color: '#f59e0b' },
        { label: 'Training ROI Est.',      value: `${(1 + org.summary.avgImprovement / 10).toFixed(1)}x`, sub: 'vs traditional training cost', color: '#ec4899' },
      ],
      skillTrend:      overview.skillTrend,
      featureUsage:    org.featureUsage,
      completionTrend: org.completionTrend,
      batchReports:    org.batchReports,
    };
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────

  async exportReportCsv(): Promise<string> {
    const { users } = await this.getUserActivity();
    const headers = ['Name','Email','Batch','Role','Status','Join Date','Last Login','Total Usage (hrs)','Avg Session (min)','AI Tutor (min)','Modules Done','Assessment Score (%)','Streak (days)','Certificates'];
    const rows = users.map(u => [
      u.name, u.email, u.batch, u.role, u.status,
      new Date(u.joinDate).toLocaleDateString('en-IN'),
      new Date(u.lastLogin).toLocaleDateString('en-IN'),
      u.totalUsage, u.avgSessionMins, u.aiTutorMins,
      u.modulesDone, u.assessmentScore, u.streak, u.certificates,
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  // ── Create User ────────────────────────────────────────────────────────────

  async createUser(dto: {
    firstName: string; lastName: string; email: string; username: string;
    password: string; phone?: string; character?: string;
    batch?: string; role?: string; isActive?: boolean;
  }) {
    if (await this.userRepo.findOne({ where: { email: dto.email } }))
      throw new ConflictException('A user with this email already exists.');
    if (await this.userRepo.findOne({ where: { username: dto.username } }))
      throw new ConflictException('This username is already taken.');

    const user = this.userRepo.create({
      id: ulid(), first_name: dto.firstName, last_name: dto.lastName,
      email: dto.email, username: dto.username,
      password_hash: await bcrypt.hash(dto.password, 10),
      phone: dto.phone ?? '', character: dto.character ?? 'default',
      is_active: dto.isActive ?? true, batch: dto.batch ?? null, role: dto.role ?? 'Agent',
    });

    const saved = await this.userRepo.save(user);
    const safe = { ...saved } as any;
    delete safe.password_hash;
    return safe;
  }

  // ── List Users ─────────────────────────────────────────────────────────────

  async listUsers() {
    const users = await this.userRepo.find({
      where: { deleted_at: null }, order: { created_at: 'DESC' },
      select: ['id','first_name','last_name','email','username','phone','character','is_active','batch','role','created_at','updated_at'],
    });
    return users.map(u => ({
      id: u.id, name: `${u.first_name} ${u.last_name}`,
      firstName: u.first_name, lastName: u.last_name,
      email: u.email, username: u.username,
      batch: u.batch ?? '—', role: u.role ?? 'Agent',
      status: u.is_active ? 'active' : 'inactive',
      joinDate: u.created_at, lastLogin: u.updated_at,
    }));
  }

  // ── Toggle Status ──────────────────────────────────────────────────────────

  async toggleUserStatus(userId: string, isActive: boolean) {
    await this.userRepo.update({ id: userId }, { is_active: isActive });
    return { success: true, userId, isActive };
  }

  // ── Update User ────────────────────────────────────────────────────────────

  async updateUser(userId: string, dto: {
    firstName?: string; lastName?: string; batch?: string;
    role?: string; phone?: string; isActive?: boolean;
  }) {
    const update: Partial<User> = {};
    if (dto.firstName !== undefined) update.first_name = dto.firstName;
    if (dto.lastName  !== undefined) update.last_name  = dto.lastName;
    if (dto.batch     !== undefined) update.batch      = dto.batch;
    if (dto.role      !== undefined) update.role       = dto.role;
    if (dto.phone     !== undefined) update.phone      = dto.phone;
    if (dto.isActive  !== undefined) update.is_active  = dto.isActive;

    await this.userRepo.update({ id: userId }, update);
    const updated = await this.userRepo.findOne({ where: { id: userId } });
    return {
      id: updated.id, name: `${updated.first_name} ${updated.last_name}`,
      email: updated.email, username: updated.username,
      batch: updated.batch ?? '—', role: updated.role ?? 'Agent',
      status: updated.is_active ? 'active' : 'inactive',
    };
  }

  // ── Full User Detail — modules, sub-modules, assessments, certificates ────
  async getUserFullDetail(userId: string) {
    const [user, moduleProgress, attempts, certificates, gameStats, lessonAttempts] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }).catch(() => null),
      this.moduleProgressRepo.find({ where: { userId } }).catch(() => []),
      this.attemptRepo.find({ where: { userId }, order: { createdAt: 'ASC' } }).catch(() => []),
      this.certRepo.find({ where: { userId }, order: { createdAt: 'DESC' } }).catch(() => []),
      this.gameRepo.createQueryBuilder('g')
        .select('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN g.completed = true THEN 1 ELSE 0 END)', 'completed')
        .addSelect('COALESCE(AVG(CASE WHEN g.completed = true THEN g.accuracy END), 0)', 'avgAccuracy')
        .addSelect('COALESCE(SUM(g."xpEarned"), 0)', 'totalXp')
        .where('g."userId" = :uid', { uid: userId })
        .getRawOne().catch(() => ({ total: 0, completed: 0, avgAccuracy: 0, totalXp: 0 })),
      this.lessonAttemptRepo.find({ where: { userId }, order: { createdAt: 'DESC' } }).catch(() => []),
    ]);

    if (!user) return null;

    const ALL_KNOWN_SUBMODULE_IDS = new Set(Object.values(MODULE_SECTIONS).flat());
    const validAttemptSubIds = new Set<string>();

    lessonAttempts.forEach(la => {
      if (la.status === 'completed' || (la.overallScore !== null && la.overallScore !== undefined && la.overallScore > 0)) {
        if (la.lessonId && ALL_KNOWN_SUBMODULE_IDS.has(la.lessonId)) {
          validAttemptSubIds.add(la.lessonId);
        } else if (la.moduleId && ALL_KNOWN_SUBMODULE_IDS.has(la.moduleId)) {
          validAttemptSubIds.add(la.moduleId);
        }
      }
    });

    const completedSubIds = new Set<string>();

    // For BOTH speaking and writing, submodules are ONLY counted as completed
    // if the user has an actual attempt in lessonAttempts (attempt_lessons table).
    validAttemptSubIds.forEach(subId => completedSubIds.add(subId));

    const clamp = (val: number) => Math.min(100, Math.max(0, Math.round(val)));

    const modules = Object.entries(MODULE_SECTIONS).map(([moduleId, subIds]) => {
      const category = moduleId.startsWith('sp') ? 'speaking' : 'writing';
      const completedSubs = subIds.filter(id => completedSubIds.has(id));
      return {
        moduleId, label: MODULE_LABELS[moduleId] || moduleId, category,
        totalSubs: subIds.length, completedSubs: completedSubs.length,
        completed: completedSubs.length >= subIds.length,
        subModules: subIds.map(subId => {
          const isCompleted = completedSubIds.has(subId);
          const modProgressMatch = isCompleted ? moduleProgress.find(m => m.subModuleId === subId && m.completed) : null;
          const lessonAttemptMatch = lessonAttempts.find(la => (la.moduleId === subId || la.lessonId === subId) && (la.status === 'completed' || (la.overallScore && la.overallScore > 0)));
          return {
            subModuleId: subId, label: SUBMODULE_LABELS[subId] || subId,
            completed: isCompleted,
            completedAt: lessonAttemptMatch?.createdAt || null,
            score: lessonAttemptMatch ? Math.round(lessonAttemptMatch.overallScore || 0) : null,
          };
        }),
      };
    });

    const assessmentHistory = attempts.map(a => {
      const denom = Math.max(5, (a.answers as any[])?.length || 5);
      return {
        id: a.id, category: a.category, level: a.level,
        rawScore: a.score, totalQuestions: denom,
        percentage: clamp((a.score / denom) * 100),
        passed: a.passed, createdAt: a.createdAt,
      };
    });

    const getScore = (cat: string, lvl: string) => {
      const att = assessmentHistory.filter(a => a.category === cat && a.level === lvl);
      if (!att.length) return null;
      return { best: Math.max(...att.map(a => a.percentage)), passed: att.some(a => a.passed), attempts: att.length };
    };

    const entryScore  = assessmentHistory.length > 0 ? assessmentHistory[0].percentage : 0;
    const latestScore = assessmentHistory.length > 0 ? assessmentHistory[assessmentHistory.length - 1].percentage : 0;

    // Module-based progress score (used for level calculation)
    const modulesDoneCount = modules.filter(m => m.completed).length;
    const moduleProgressScore = Math.round((modulesDoneCount / 8) * 100);
    const totalSubModules = Object.values(MODULE_SECTIONS).flat().length;

    return {
      user: {
        id: user.id, name: `${user.first_name} ${user.last_name}`,
        email: user.email, phone: user.phone,
        batch: (user as any).batch || 'N/A', role: (user as any).role || 'Agent',
        character: (user as any).character || 'eva', isActive: user.is_active,
        createdAt: user.created_at,
      },
      summary: {
        totalModules: 8, modulesDone: modulesDoneCount,
        speakingDone: modules.filter(m => m.category === 'speaking' && m.completed).length,
        writingDone: modules.filter(m => m.category === 'writing' && m.completed).length,
        totalSubModules, subModulesDone: completedSubIds.size,
        entryScore, latestScore,
        moduleProgressScore,
        improvement: latestScore - entryScore,
        certificates: certificates.length, totalAttempts: assessmentHistory.length,
        lessonAttemptsCount: lessonAttempts.length,
        gamesPlayed: Number(gameStats?.total) || 0,
        gamesCompleted: Number(gameStats?.completed) || 0,
        avgAccuracy: Math.round(Number(gameStats?.avgAccuracy) || 0),
        totalXp: Math.round(Number(gameStats?.totalXp) || 0),
      },
      modules,
      assessments: {
        speaking: { beginner: getScore('speaking','BEGINNER'), intermediate: getScore('speaking','INTERMEDIATE'), advanced: getScore('speaking','ADVANCED') },
        writing:  { beginner: getScore('writing','BEGINNER'),  intermediate: getScore('writing','INTERMEDIATE'),  advanced: getScore('writing','ADVANCED') },
      },
      assessmentHistory,
      lessonAttempts: lessonAttempts.map(la => ({
        id: la.id,
        moduleId: la.moduleId,
        lessonId: la.lessonId,
        level: la.level,
        set: la.set,
        overallScore: Math.round(la.overallScore || 0),
        status: la.status,
        createdAt: la.createdAt,
        responses: la.responses,
      })),
      certificates: certificates.map(c => ({
        id: c.id, category: c.category, moduleName: c.moduleName,
        score: clamp(c.score), recipientName: c.recipientName, createdAt: c.createdAt,
      })),
    };
  }
}