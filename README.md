# Waitlisteria / 候博士

Track graduate and undergraduate admission waitlists and offer trends in real time. Powered by Gemini AI with Google Search grounding.

## Features

- **AI-powered analysis** — Searches Reddit, Gradcafe, and Rednote for real applicant reports
- **Historical + current season data** — 5-year averages alongside live season progress
- **Bilingual** — Full English and Simplified Chinese support
- **Auth & history** — Magic link sign-in, session history sidebar
- **Watchlist & notifications** — Watch schools for updates, get email notifications via Resend
- **Client-side WL chance calculation** — Probability estimates based on historical and current data

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS 4
- **i18n**: next-intl v4
- **Database & Auth**: Supabase (Postgres + magic link auth)
- **AI**: Google Gemini 2.5 Pro with Google Search grounding
- **Email**: Resend
- **Search**: Fuse.js for fuzzy autocomplete

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` (exposed to client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` (exposed to client) |
| `NEXT_PUBLIC_CURRENT_SEASON` | e.g. `2026 Fall` |
| `RESEND_API_KEY` | Resend API key for email notifications |
| `RESEND_FROM_EMAIL` | Sender email (must be from a verified Resend domain) |

### 3. Database setup

Run the SQL migrations in order in the Supabase SQL editor:

1. `supabase/migrations/001_results_cache.sql`
2. `supabase/migrations/002_analysis_sessions.sql`
3. `supabase/migrations/003_watchlist.sql`
4. `supabase/migrations/004_watchlist_lang.sql`

### 4. Supabase Auth

- Enable **Email (magic link)** provider in Supabase Dashboard > Authentication > Providers
- Add your app URL to the redirect URLs allowlist (e.g. `http://localhost:3000/auth/callback`)
- (Optional) Configure custom SMTP via Resend for higher email throughput

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables in Vercel project settings
4. Add your production URL to Supabase's redirect URL allowlist
5. Update `RESEND_FROM_EMAIL` to use your verified domain

## Project Structure

```
src/
  app/
    [locale]/          # Locale-based routing (en, zh)
      layout.tsx       # Root layout with fonts, providers
      page.tsx         # Landing page
      track/page.tsx   # Main analysis page
    api/
      analyze/         # SSE streaming analysis endpoint
      sessions/        # User session CRUD
      watchlist/       # Watchlist CRUD + notification toggle
    auth/callback/     # Magic link redirect handler
  components/          # React components
  data/                # Static data (institutions, programs, abbreviations)
  i18n/                # next-intl routing, navigation, request config
  lib/                 # Server utilities (Gemini, pipeline, cache, notify)
messages/              # Translation files (en.json, zh.json)
supabase/migrations/   # SQL migration files
```
