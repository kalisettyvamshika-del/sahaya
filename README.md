# SAHAYA — Prepare. Connect. Respond.

A **personal safety & emergency coordination platform**.
Helps users prepare for journeys, stay connected with trusted people, activate an emergency response,
locate verified assistance, and securely organize incident information.

> **Disclaimer:** SAHAYA does not replace emergency services. Always call your local emergency number (e.g. 112 in India, 911 in the US) when in immediate danger.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS 3 (light theme, glassmorphism, mobile-first) |
| Backend | Node.js + Express 4 (ESM) |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | bcrypt + JWT sessions |
| AI | Google Gemini (server-side only — never exposed to frontend) |
| Deploy | Frontend → Vercel · Backend → Render |

## Features

- **Auth**: signup / login with bcrypt, JWT session, change-password, delete account
- **Safety Status**: 🟢 I'm Safe · 🟡 Check on Me · 🔴 Emergency
- **Trusted Circle**: CRUD contacts, set primary, test notification
- **Journey**: start / complete / cancel, check-ins (safe / extend / help)
- **Safety Timer**: "check on me in N minutes" with extend / cancel / escalate
- **Incident Vault**: private CRUD + AI summary (Gemini)
- **Community Reports**: public infrastructure-issue reporting (no personally-identifying accusations)
- **AI Safety Assistant**: chat UI backed by Gemini, with safety guardrails
- **Emergency Mode**: creates an event, notifies trusted contacts, honestly reports delivery status
- **Multilingual**: English + Hindi + Telugu critical strings (extensible)
- **Responsive, accessible, reduced-motion aware**

## Project structure

```
sahaya/
├── client/                  # React + Vite + Tailwind (what users see)
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/             # api client, i18n (NO secrets)
│   │   └── pages/
│   ├── .env.example         # only VITE_API_BASE_URL (public URL)
│   └── vercel.json
├── server/                  # Express backend (the brain)
│   ├── src/
│   │   ├── middleware/      # auth, errorHandler
│   │   ├── routes/          # auth, profile, contacts, journeys, timers, incidents, reports, emergency, ai, health
│   │   └── services/        # supabaseClient, supabaseInit, geminiService
│   ├── schema.sql           # one-time DB setup
│   ├── .env.example         # ALL secrets live here (Supabase + Gemini + JWT)
│   └── render.yaml
└── .gitignore               # hides .env, node_modules, dist
```

## Local development

### 1. Backend
```bash
cd server
cp .env.example .env       # fill in real values
npm install
npm run init-db             # applies schema.sql to Supabase (optional DATABASE_URL, see below)
npm run dev                 # http://localhost:8080
```

### 2. Frontend
```bash
cd client
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:8080
npm install
npm run dev                 # http://localhost:5173
```

## Database setup (one-time)

The cleanest path:

1. Open Supabase Dashboard → SQL Editor → New query.
2. Paste the contents of `server/schema.sql`.
3. Click Run.

The `npm run init-db` script will automatically run `schema.sql` against your Supabase Postgres if you set
`DATABASE_URL` in `server/.env` (find it in Supabase → Project Settings → Database → Connection string).

## Production deployment

### Backend → Render
Use the included `server/render.yaml` or create a new Web Service via Render dashboard:
- Build Command: `npm install`
- Start Command: `npm start`
- Health check: `/api/health`
- Environment variables: see `server/.env.example`

### Frontend → Vercel
- Framework: Vite
- Build: `npm install && npm run build`
- Output: `dist`
- Env var: `VITE_API_BASE_URL` = your Render backend URL

## Security notes

- Passwords hashed with bcrypt (10 rounds)
- JWT sessions (7-day expiry, configurable)
- Helmet + rate-limiting + CORS allow-list
- Row-Level Security enabled on every Supabase table
- Service-role key used ONLY on the backend; never shipped to the browser
- `GEMINI_API_KEY` lives only in `server/.env`
- `.gitignore` excludes `.env`, `node_modules`, `dist`
- No fake success: emergency delivery status reflects the actual provider state
- AI guardrails: never diagnoses danger, never auto-notifies authorities

## Honest scope

This build intentionally **does not simulate** features that require external providers:
- **Direct police / emergency-service integration**: requires an authorized adapter. Until configured, the app honestly reports "no authorized emergency-service integration is configured" and shows the official public emergency number.
- **Real SMS / Push / Email delivery to trusted contacts**: notifications are logged in the `notifications` table. Wire Twilio / Firebase / SES to enable real delivery.
- **Passkeys / WebAuthn**: not yet implemented — secure fallback login is the email+password flow.
- **Live location streaming**: not yet implemented — one-shot location is captured on emergency activate, with explicit user permission.

These are **staged visibly as "unavailable"** rather than faked.
