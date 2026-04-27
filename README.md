# MMW Newsletter Generator

Voice-translation newsletter writer for MMW clinic clients across four verticals: OB/GYN, Med Spa, Functional Medicine, Urogynecology.

Output: labeled copy/paste blocks the AE pastes into GoHighLevel email templates. Tool does not send email or hit GHL APIs in V1.

## Stack

- Node.js + Express
- Single-file frontend (`public/index.html`)
- Supabase (separate project from existing MMW tools)
- Anthropic Claude Sonnet 4.6 (`claude-sonnet-4-6`), prompt caching enabled on system prompts
- Render hosting, auto-deploy from `main`

## Setup (one-time)

### 1. Supabase
- Create a new project. Copy the project URL and the service role key.
- Open the SQL editor. Paste and run `db/01_schema.sql`.
- Then paste and run `db/02_seed.sql`.

### 2. GitHub
- Create a private repo under MMW-Tyler.
- Push the contents of this directory.

### 3. Render
- New Web Service, connect the repo. `render.yaml` will be auto-detected.
- Set the five env vars in the Render dashboard:
  - `ANTHROPIC_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_LOGIN_EMAIL`
  - `APP_LOGIN_PASSWORD`
- Deploy.

### 4. Verify
- Open the Render URL.
- The status badge top-right should say "all systems".
- `/api/health` should return `env: { supabase: true, anthropic: true, login_configured: true }`.
- Sign in with the shared login.

## First test run

1. Click **+ New Client** on the dashboard. Pick a vertical and AE.
2. Open the client profile. Paste in a master record (the only required asset).
3. Optionally paste a brand voice document and add custom rules.
4. Click **Generate Newsletter**. Pick a month, optionally check awareness days, give it a topic and what to feature.
5. The output page shows the seven labeled blocks. Edit inline, regenerate any single section with feedback, or regenerate the whole thing.

## Local dev

```bash
npm install
cp .env.example .env
# fill in .env (point SUPABASE_URL at the dev Supabase project)
npm run dev
```

Visit http://localhost:3000.

## Project structure

```
mmw-newsletter-generator/
├── server.js                ← Express backend, all routes
├── prompts.js               ← Prompt system (vertical-specific systems + builders)
├── public/
│   └── index.html           ← Single-file SPA (login, dashboard, profile, generate, output)
├── db/
│   ├── 01_schema.sql        ← Run first
│   └── 02_seed.sql          ← Run second (calendar events + starter AEs)
├── package.json
├── render.yaml              ← Render service config
├── .env.example
└── .gitignore
```

## How it generates

1. Pulls the client's master record, brand voice (optional), and custom rules.
2. Pulls the selected calendar events for the month.
3. Pulls last month's `topic_summary` to avoid repetition.
4. Sends to Sonnet 4.6 with the vertical-specific system prompt (cached).
5. Parses the seven labeled blocks (`[[INTRO]]`, `[[TOC]]`, etc.) into separate fields.
6. Asynchronously generates a `topic_summary` for next-month repetition avoidance.

## Conventions (matches existing MMW tools)

- `prompts.js` is its own file. Server logic never touches prompt text.
- Soft delete (archive) preferred over hard delete.
- Single shared login. AEs are tracked via dropdown on each record, not via auth.
- Newsletter rows are keyed by `(client_id, month, year)`. Re-generating overwrites the same row.

## Sonnet 4.6 model verification

API ID `claude-sonnet-4-6` confirmed against [Anthropic models documentation](https://platform.claude.com/docs/en/about-claude/models/overview) on 2026-04-27. Pricing is $3/MTok input, $15/MTok output, with 90% discount on cache hits for the system prompt.
