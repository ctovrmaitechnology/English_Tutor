# LingoCoach AI — English Communication Buddy

A premium, production-ready AI English Speaking Tutor dashboard built for BPO employees to improve spoken English communication skills.

---

## 📁 Project Structure

```
english-tutor/
├── 📄 README.md                    ← You are here
└── 📁 frontend/                    ← React.js SPA (Vite)
    ├── 📄 index.html
    ├── 📄 package.json
    ├── 📄 vite.config.js
    ├── 📄 eslint.config.js
    ├── 📄 .gitignore
    ├── 📁 public/
    │   ├── 📄 favicon.svg
    │   └── 📁 mock-data/           ← JSON stubs (replace with real APIs)
    │       ├── overview.json
    │       ├── assessment.json
    │       ├── challenges.json
    │       └── profile.json
    └── 📁 src/
        ├── 📄 App.jsx              ← Main shell: routing, auth state, layout
        ├── 📄 main.jsx             ← React DOM entry point
        ├── 📁 assets/              ← 3D Pixar-style character pose images
        │   ├── boy_custom.png      ← Boy idle pose
        │   ├── boy_wave.png        ← Boy waving (hover/click)
        │   ├── boy_celebrate.png   ← Boy both-hands-raised (victory)
        │   ├── boy_nervous.png     ← Boy nail-biting (challenge fear)
        │   ├── girl_custom.png     ← Girl idle pose
        │   ├── girl_wave.png       ← Girl waving (hover/click)
        │   ├── girl_celebrate.png  ← Girl both-hands-raised (victory)
        │   └── girl_nervous.png    ← Girl nail-biting (challenge fear)
        ├── 📁 components/
        │   ├── 📄 index.js         ← Barrel export (Sidebar, Companion, CompanionEvents, Confetti)
        │   ├── 📁 layout/
        │   │   ├── Sidebar.jsx     ← Fixed left nav with all menu items
        │   │   └── Sidebar.css
        │   ├── 📄 Confetti.jsx     ← Canvas-based celebration confetti effect
        │   └── 📁 Companion/       ← Interactive AI learning companion widget
        │       ├── Companion.jsx         ← Root wrapper (click, hover, double-click)
        │       ├── CompanionAnimations.jsx ← Character SVG + 3D image renderer
        │       ├── CompanionStateManager.jsx ← State machine + speech logic (hook)
        │       ├── CompanionEvents.js    ← Pub-Sub event bus
        │       ├── CompanionSpeechBubble.jsx ← Floating dialog bubble
        │       └── CompanionStyles.css   ← All companion animations & states
        ├── 📁 constants/
        │   └── index.js            ← APP_NAME, APP_TAGLINE, NAV_ITEMS
        ├── 📁 pages/               ← Lazy-loaded view components
        │   ├── Overview.jsx + .css
        │   ├── Assessment.jsx + .css
        │   ├── Challenges.jsx + .css
        │   ├── Profile.jsx + .css
        │   ├── Login.jsx + .css
        │   └── index.js            ← Barrel export
        ├── 📁 styles/
        │   └── index.css           ← Global CSS variables, resets, tokens
        └── 📁 utils/
            ├── cdn.js              ← CloudFront CDN fetch utility + caching
            └── index.js            ← General helper functions
```

---

## 🚀 Running the Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Open → [http://localhost:5173](http://localhost:5173)

**Login credentials** (hardcoded for now — replace with real auth API):
- Any email + password on the login screen will work (no validation yet)

---

## 🔌 API Integration Guide (For Backend Team)

All pages currently use **static mock JSON files** from `/public/mock-data/`. The frontend is built to accept real REST API responses in the **exact same shape** as the mock data below.

### Base URL Configuration

Set the following in a `.env` file at the `frontend/` level:

```env
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_CLOUDFRONT_URL=https://your-cloudfront-distribution.cloudfront.net
```

The CDN utility in `src/utils/cdn.js` automatically uses `VITE_CLOUDFRONT_URL` for asset resolution with fallback to local.

---

### 📌 API Endpoints Required

---

#### 1. `GET /api/overview` — Overview Page

**Used in:** `src/pages/Overview.jsx`

**Response shape:**
```json
{
  "user": {
    "name": "Priya",
    "level": "B2 Level",
    "streak": 4,
    "dailyGoal": {
      "completed": 20,
      "target": 30,
      "percentage": 66.7
    }
  },
  "stats": [
    { "id": "study-time", "label": "Study Time", "value": "20 mins", "delta": "+10m today", "type": "blue" },
    { "id": "vocab-bank", "label": "Vocab Bank", "value": "1,420 words", "delta": "+12 today", "type": "emerald" },
    { "id": "accuracy", "label": "Speech Accuracy", "value": "84%", "delta": "+3% this week", "type": "purple" },
    { "id": "streak", "label": "Daily Streak", "value": "4 Days", "delta": "Flame is hot!", "type": "amber" }
  ],
  "skills": [
    { "name": "Pronunciation Clarity", "percentage": 82, "color": "blue" },
    { "name": "Grammar Accuracy", "percentage": 78, "color": "purple" },
    { "name": "Fluency & Pacing", "percentage": 85, "color": "emerald" },
    { "name": "Vocabulary Scope", "percentage": 80, "color": "amber" }
  ],
  "simulatedSpeeches": [
    "Thank you for calling Customer Care. My name is Priya...",
    "..."
  ],
  "dailyInsight": "Your fluency has increased by 5% since last week."
}
```

---

#### 2. `GET /api/assessment` — Assessment Page

**Used in:** `src/pages/Assessment.jsx`

**Response shape:**
```json
{
  "placement": {
    "level": "B2 (Upper Intermediate)",
    "score": 76,
    "completedPercentage": 75,
    "voiceProcessEligible": true
  },
  "pastAssessments": [
    { "id": 1, "name": "Refund Authorization Dispute", "grade": "A-", "score": 88, "date": "May 28, 2026", "wpm": 124, "fluency": "High" },
    { "id": 2, "name": "Broadband Setup Callback", "grade": "B+", "score": 81, "date": "May 22, 2026", "wpm": 112, "fluency": "Moderate" }
  ]
}
```

---

#### 3. `GET /api/challenges` — Challenges Page

**Used in:** `src/pages/Challenges.jsx`

**Response shape:**
```json
{
  "streak": {
    "days": 4,
    "multiplier": "XP x1.2 Active"
  },
  "quests": [
    { "id": "q1", "type": "completed", "title": "Pronunciation Workout", "desc": "Read 5 difficult customer service terms aloud.", "reward": "+10 XP" },
    { "id": "q2", "type": "active",    "title": "Idioms Match Challenge", "desc": "Define BPO idioms correctly.", "reward": "+15 XP" },
    { "id": "q3", "type": "locked",    "title": "Grammar Polish Run",    "desc": "Find grammar faults in 3 complaint emails.", "reward": "+20 XP" }
  ],
  "badges": [
    { "id": "b1", "name": "Quick Starter",    "desc": "Log in for 3 consecutive days.", "icon": "🚀", "unlocked": true },
    { "id": "b2", "name": "Speaking Legend",  "desc": "Log 60 speaking minutes total.", "icon": "🎙️", "unlocked": true },
    { "id": "b3", "name": "Daily Devotee",    "desc": "Maintain a 3-day practice streak.", "icon": "🔥", "unlocked": true },
    { "id": "b4", "name": "Customer Champ",  "desc": "Score 90%+ on billing roleplay.", "icon": "🏆", "unlocked": false },
    { "id": "b5", "name": "Fluency King",    "desc": "Reach 130 WPM average.", "icon": "👑", "unlocked": false },
    { "id": "b6", "name": "Vocabulary Boss", "desc": "Save 100 words in personal vocab.", "icon": "📖", "unlocked": false },
    { "id": "b7", "name": "Grammar Guru",    "desc": "Complete placement with 0 grammar errors.", "icon": "🎯", "unlocked": false },
    { "id": "b8", "name": "Perfect Pronouncer", "desc": "Score 100% pronunciation in timed exam.", "icon": "🗣️", "unlocked": false }
  ]
}
```

> **`type` field for quests:** `"completed"` | `"active"` | `"locked"`

---

#### 4. `GET /api/profile` — Profile Page

**Used in:** `src/pages/Profile.jsx`

**Response shape:**
```json
{
  "user": {
    "name": "Priya Rajan",
    "title": "Voice Process Associate",
    "department": "Customer Support - Inbound Telecom",
    "email": "priya.rajan@company.com",
    "phone": "+91 98765 43210",
    "location": "Chennai, India"
  },
  "metrics": {
    "totalXp": "4,250",
    "completedSessions": 42,
    "averageAccuracy": "84%"
  },
  "preferences": {
    "grammarStrict": true,
    "speechCoaching": true,
    "speechThreshold": 80
  }
}
```

---

#### 5. `POST /api/auth/login` — Login

**Used in:** `src/pages/Login.jsx`

**Request body:**
```json
{
  "email": "priya.rajan@company.com",
  "password": "••••••••"
}
```

**Success response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "name": "Priya",
    "email": "priya.rajan@company.com"
  }
}
```

**Error response (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### 🎙️ Future / Planned API Endpoints (Not yet wired)

These are features already designed in the UI — backend stubs will be needed:

| Endpoint | Method | Description |
|---|---|---|
| `/api/speech/submit` | `POST` | Submit audio blob for AI pronunciation scoring |
| `/api/speech/feedback` | `GET` | Fetch latest AI feedback on submitted audio |
| `/api/challenges/:id/start` | `POST` | Mark a quest as started |
| `/api/challenges/:id/complete` | `POST` | Mark a quest as completed, award XP |
| `/api/badges/:id/unlock` | `POST` | Unlock a specific badge |
| `/api/profile/preferences` | `PATCH` | Save updated user preference settings |

---

## 🧩 Companion Widget — Event System

The AI Companion widget (bottom-right corner) reacts to **app events** via a pub-sub bus (`CompanionEvents`). Backend events that arrive via WebSocket or API can be piped into the companion using:

```js
import { CompanionEvents } from './components';

// Trigger companion reactions from anywhere in the app:
CompanionEvents.emit('LOGIN_SUCCESS');
CompanionEvents.emit('CHALLENGE_COMPLETED');
CompanionEvents.emit('BADGE_UNLOCKED');
CompanionEvents.emit('ASSESSMENT_SUBMITTED');
CompanionEvents.emit('LONG_SESSION_ENCOURAGE');
```

**All available events:**

| Event Name | Companion Reaction |
|---|---|
| `LOGIN_SUCCESS` | Waves & says welcome |
| `RETURNING_USER` | Greets returning user |
| `COMPANION_CLICKED` | Bounces, says hi |
| `COMPANION_HOVERED` | Raises hand, says "Hiiiiiiii!" |
| `COMPANION_UNHOVERED` | Returns to idle |
| `CHALLENGE_OPENED` | Nervous shivering + sweat drops |
| `CHALLENGE_STARTED` | Cheers the user on |
| `CHALLENGE_COMPLETED` | Celebration dance + confetti |
| `ASSESSMENT_SUBMITTED` | Celebrates submission |
| `BADGE_UNLOCKED` | Celebrates new badge |
| `PROFILE_OPENED` | Encourages user to review growth |
| `USER_IDLE` | Falls asleep with Zzz bubbles |
| `LONG_SESSION_ENCOURAGE` | Thumbs up + encouragement |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| State | React hooks (`useState`, `useReducer`, `useEffect`) |
| Server State | TanStack React Query v5 |
| Icons | Lucide React |
| Styling | Vanilla CSS (CSS custom properties) |
| Asset Delivery | AWS CloudFront CDN (`src/utils/cdn.js`) |
| Build | Vite (ESM, tree-shaking, lazy code-splitting) |

---

## ⚙️ Environment Variables

Create a `.env` file inside `frontend/`:

```env
VITE_API_BASE_URL=https://your-api.com/api
VITE_CLOUDFRONT_URL=https://your-cf-distribution.cloudfront.net
```

> All env vars must be prefixed with `VITE_` to be exposed to the browser by Vite.

---

## 🔑 Notes for Backend Team

1. **All mock data shapes are final** — The frontend consumes exactly these JSON shapes. Do not add extra nesting.
2. **Auth token** — Store the JWT token returned from `/api/auth/login` in `localStorage` under the key `lingocoach_token`. The frontend will send it as `Authorization: Bearer <token>` in future API calls.
3. **CORS** — Ensure CORS is enabled for the frontend origin (e.g., `https://your-frontend.cloudfront.net`).
4. **The `type` field in quests** must be one of: `"completed"`, `"active"`, `"locked"`.
5. **Badge `unlocked` field** is a boolean — `true` shows the badge as earned, `false` shows "CLICK TO UNLOCK".
