# MCQ Prep System — FPSC · CSS · NTS · STS

An AI-powered, online MCQ study and answer platform. Upload a past paper (PDF, scanned image,
Word, Excel or plain text), and it's OCR/AI-read, split into questions and options, answers are
detected from an answer key or determined by AI (with a confidence rating), and flagged for
review whenever it isn't sure — before anything is ever saved permanently. Then practice with
timed tests, mock exams, topic-wise drills, search, bookmarks, a mistake notebook and a live
performance dashboard.

## Architecture

```
mcq-system/
├── frontend/              React + Vite + Tailwind single-page app (deployed as a static site)
├── netlify/functions/     Serverless backend (Node). Holds every secret. Never shipped to the browser.
├── supabase/schema.sql    Full Postgres schema, RLS policies, and the Vault-backed key store
└── netlify.toml           Netlify build + routing config
```

- **Database & Auth & Storage:** [Supabase](https://supabase.com) — Postgres, built-in email/password
  auth with admin/user roles, and private file storage for uploaded papers.
- **AI / OCR:** Anthropic Claude (vision + text) reads the uploaded file directly — PDFs and scanned
  images are sent to Claude as-is; Word/Excel files are text-extracted server-side first. Swappable:
  see "Changing the AI provider" below.
- **Hosting:** Netlify — the frontend is a static build, the backend is Netlify Functions.
- **Secrets:** API keys are entered once in the in-app **Settings** page (admin only) and stored
  encrypted in **Supabase Vault**. They are decrypted only inside Netlify Functions using the
  Supabase *service role* key — never in frontend JavaScript, never hard-coded.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New project. Pick any name/region/password.
2. Once it's ready, open **SQL Editor** → paste the entire contents of `supabase/schema.sql` →
   Run. This creates every table, view, RLS policy, the Vault-backed settings function, and a
   private `papers` storage bucket. Safe to re-run if you ever need to.
3. Go to **Authentication → Providers** and make sure **Email** is enabled (it is by default).
   Optionally turn off "Confirm email" while testing so sign-up is instant.
4. Go to **Project Settings → API** and copy three values you'll need next:
   - `Project URL`
   - `anon` `public` key
   - `service_role` key (⚠️ keep this secret — it bypasses all security rules)

**Who becomes admin?** The very first person to sign up in the app is automatically made an
admin (see the `handle_new_user()` trigger in the schema). Sign up first, before sharing the app
with anyone else, if you want to control who that is. You can promote others later by updating
their `role` to `'admin'` in the `profiles` table from the Supabase dashboard.

## 2. Get an Anthropic API key (or skip — you can add it later from Settings)

Create a key at [console.anthropic.com](https://console.anthropic.com/settings/keys). You don't
need to set this as an env var — once the app is deployed, sign in as the admin and add it from
the **Settings** page in the app itself (recommended, and rotatable without redeploying). An
`ANTHROPIC_API_KEY` env var is also supported as a fallback for a pure env-var deploy.

## 3. Configure environment variables

Copy `.env.example` to `.env` for local dev, and set the same variables in **Netlify → Site
settings → Environment variables** for the deployed site:

| Variable | Where it's used | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | No |
| `VITE_SUPABASE_ANON_KEY` | Frontend | No (RLS protects data, not this key) |
| `SUPABASE_URL` | Netlify Functions | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify Functions | **Yes — never expose this** |
| `ANTHROPIC_API_KEY` | Netlify Functions (fallback only) | Yes, if set |

## 4. Run locally

```bash
cd frontend && npm install
npm run dev              # frontend on http://localhost:5173

# in another terminal, from the repo root, to run functions locally too:
npm install -g netlify-cli
netlify dev               # serves frontend + functions together, proxies /api/*
```

## 5. Deploy to Netlify

- **Via the Netlify dashboard:** New site from Git → point at this repo. Netlify reads
  `netlify.toml` automatically (base directory `frontend`, functions directory
  `netlify/functions`, SPA redirect included). Add the environment variables from step 3, then
  deploy.
- **Via CLI:** `netlify init` then `netlify deploy --prod` from the repo root.

After the first deploy: sign up in the live app (this makes you admin) → go to **Settings** →
paste your Anthropic API key → start uploading papers.

## How the import pipeline works

1. **Upload** — drag & drop one or many files. Duplicate files (by content hash) are detected
   before they're even uploaded.
2. **OCR / AI extraction** — a Netlify Function downloads the file and sends it to Claude, which
   detects every question, its options, and either reads the paper's own answer key or determines
   the answer itself with an honest confidence rating (high/medium/low). Ambiguous questions are
   flagged `needs_review` instead of guessed.
3. **Review** — nothing is visible to anyone else yet. You see every detected question, can edit
   text/options/subject, re-run AI verification per question, delete bad detections, and filter by
   "Review Required" first.
4. **Confirm Import** — only now does the paper become part of your searchable, practiceable
   library. At this point the system also cross-checks new questions against your whole library
   for near-duplicates (fuzzy text match) and marks repeats.

## Changing the AI/OCR provider

The extraction and answering logic lives entirely in `netlify/functions/utils/anthropicClient.js`
and is invoked through `getProviderApiKey()` (`utils/getSecret.js`), which reads whatever provider
was last configured via Settings. To add a second provider (e.g. OpenAI):

1. Write an equivalent `utils/openaiClient.js` exporting the same two functions
   (`extractQuestionsFromDocument`, `answerSingleQuestion`).
2. In `extract.js` / `verify-answer.js`, branch on `provider` (already returned by
   `getProviderApiKey()`) to call the right client.
3. Add the provider to the `PROVIDERS` list in `frontend/src/pages/Settings.jsx`.

No frontend or database changes are needed — the key storage and Settings UI are already
provider-agnostic.

## Security notes

- Every table has row-level security. Users only ever see their own uploaded/in-review papers
  plus anything anyone has confirmed-imported; attempts, bookmarks and notes are strictly private
  per user.
- The `service_role` key and all provider API keys exist only inside Netlify Functions — the
  frontend bundle never contains them.
- Every Netlify Function re-verifies the caller's Supabase session token and role server-side
  before touching data or secrets (see `utils/auth.js`); admin-only actions are also re-checked
  inside the database function itself as defense in depth.

## What's included in this first build vs. what's next

This build ships one complete, working pipeline end-to-end: upload → OCR/AI extraction → review →
confirm → search → practice/test/mock modes with a timer → results → dashboard analytics → weak-
topic detection → bookmarks → mistake notebook → notes → dark/light mode → admin API-key Settings.

Natural next iterations (schema already supports most of these): flashcard/spaced-repetition
mode, PDF/Excel/Word export of results, an admin panel for managing all users' papers, bulk
subject/topic re-tagging, and a "frequently repeated across all papers" smart list (the
`v_repeated_questions` view is already in the schema for this).
