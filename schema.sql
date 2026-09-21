-- ============================================================================
-- MCQ Study & Answer System — Supabase schema
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE throughout).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists pg_trgm;        -- fuzzy text search / duplicate detection
create extension if not exists supabase_vault; -- encrypted secret storage for API keys

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users, adds role + display info)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  theme_preference text default 'system' check (theme_preference in ('light', 'dark', 'system')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
-- The very first user to ever sign up becomes admin automatically;
-- everyone after that defaults to 'user' (an admin can promote later).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    case when is_first then 'admin' else 'user' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Reference / taxonomy tables
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,        -- FPSC, CSS, NTS, STS, PPSC, SPSC, ...
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,        -- English, Pakistan Affairs, Islamiat, ...
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (subject_id, name)
);

insert into public.organizations (code, name) values
  ('FPSC', 'Federal Public Service Commission'),
  ('CSS', 'Central Superior Services'),
  ('NTS', 'National Testing Service'),
  ('STS', 'Sindh Testing Service'),
  ('PPSC', 'Punjab Public Service Commission'),
  ('OTHER', 'Other / Unspecified')
on conflict (code) do nothing;

insert into public.subjects (name) values
  ('English'), ('Pakistan Affairs'), ('Current Affairs'), ('Islamiat'),
  ('Everyday Science'), ('Computer Science'), ('General Knowledge'),
  ('Mathematics'), ('Analytical Reasoning'), ('Geography'),
  ('Constitution & Political Science'), ('Urdu'), ('Other')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- papers  (an uploaded past-paper file and its import pipeline status)
-- ---------------------------------------------------------------------------
create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization_id uuid references public.organizations(id),
  exam_name text,                    -- e.g. "CSS 2023 Screening Test"
  year int,
  file_path text,                    -- Supabase Storage object path
  file_type text,                    -- pdf | image | docx | xlsx | text
  file_hash text,                    -- sha256 of the uploaded file, for duplicate-paper detection
  status text not null default 'processing'
    check (status in ('processing', 'review', 'imported', 'failed')),
  extraction_error text,
  total_questions int default 0,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  imported_at timestamptz
);

create index if not exists idx_papers_uploaded_by on public.papers(uploaded_by);
create index if not exists idx_papers_org on public.papers(organization_id);
create unique index if not exists idx_papers_file_hash on public.papers(file_hash) where file_hash is not null;

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  question_number int,
  question_text text not null,
  normalized_text text generated always as (lower(regexp_replace(question_text, '[^a-zA-Z0-9]+', ' ', 'g'))) stored,
  subject_id uuid references public.subjects(id),
  topic_id uuid references public.topics(id),
  organization_id uuid references public.organizations(id),
  year int,
  has_answer_key boolean not null default false,   -- true if the source paper itself supplied the correct answer
  confidence text check (confidence in ('high', 'medium', 'low')),
  needs_review boolean not null default false,
  review_reason text,                                -- why it was flagged (ambiguous, low confidence, OCR unclear, etc.)
  is_duplicate_of uuid references public.questions(id),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_paper on public.questions(paper_id);
create index if not exists idx_questions_subject on public.questions(subject_id);
create index if not exists idx_questions_topic on public.questions(topic_id);
create index if not exists idx_questions_org on public.questions(organization_id);
create index if not exists idx_questions_uploaded_by on public.questions(uploaded_by);
create index if not exists idx_questions_needs_review on public.questions(needs_review) where needs_review = true;
create index if not exists idx_questions_text_trgm on public.questions using gin (normalized_text gin_trgm_ops);
create index if not exists idx_questions_fulltext on public.questions using gin (to_tsvector('english', question_text));

-- ---------------------------------------------------------------------------
-- options  (A/B/C/D choices for a question)
-- ---------------------------------------------------------------------------
create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_label text not null,          -- 'A', 'B', 'C', 'D'
  option_text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  unique (question_id, option_label)
);

create index if not exists idx_options_question on public.options(question_id);

-- ---------------------------------------------------------------------------
-- explanations  (AI-generated or paper-supplied reasoning for the answer)
-- ---------------------------------------------------------------------------
create table if not exists public.explanations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions(id) on delete cascade,
  explanation_text text,
  why_others_wrong jsonb,              -- { "A": "reason A is wrong", "C": "...", ... }
  generated_by text,                   -- 'answer_key' | 'anthropic:claude-...' | 'manual'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sources  (citations/references backing an AI-derived answer)
-- ---------------------------------------------------------------------------
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  source_type text default 'reference', -- 'answer_key' | 'reference' | 'web'
  source_title text,
  source_url text,
  source_note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sources_question on public.sources(question_id);

-- ---------------------------------------------------------------------------
-- user_attempts  (one row per practice/test session)
-- ---------------------------------------------------------------------------
create table if not exists public.user_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  paper_id uuid references public.papers(id) on delete set null,
  subject_id uuid references public.subjects(id),
  topic_id uuid references public.topics(id),
  mode text not null check (mode in ('practice', 'test', 'mock', 'topic_wise', 'paper_wise', 'random', 'revision', 'flashcard')),
  total_questions int not null default 0,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  skipped_count int not null default 0,
  score_percent numeric(5,2),
  duration_seconds int,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_attempts_user on public.user_attempts(user_id);
create index if not exists idx_attempts_paper on public.user_attempts(paper_id);

-- ---------------------------------------------------------------------------
-- attempt_answers  (per-question response within an attempt)
-- ---------------------------------------------------------------------------
create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.user_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_id uuid references public.options(id),
  is_correct boolean,
  time_spent_seconds int,
  created_at timestamptz not null default now()
);

create index if not exists idx_attempt_answers_attempt on public.attempt_answers(attempt_id);
create index if not exists idx_attempt_answers_question on public.attempt_answers(question_id);

-- ---------------------------------------------------------------------------
-- bookmarks & notes
-- ---------------------------------------------------------------------------
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  note_text text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

-- ---------------------------------------------------------------------------
-- app_settings  (non-secret metadata about configured AI/OCR providers)
-- The actual API key text is never stored here — it lives in Supabase Vault,
-- referenced by vault_secret_name. Only Netlify Functions using the service
-- role key can decrypt it; it is never sent to the frontend.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,               -- e.g. 'ai_provider'
  vault_secret_name text,             -- e.g. 'anthropic_api_key'  (null if not a secret)
  provider text,                      -- 'anthropic' | 'openai' | 'google_vision' | ...
  model text,                         -- e.g. 'claude-sonnet-4-5'
  is_configured boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- Admin-only RPC to store/rotate a provider API key. Runs as SECURITY DEFINER
-- so it can write to the vault schema, but it re-checks the caller is an
-- admin before doing anything.
create or replace function public.admin_set_api_key(
  p_setting_key text,
  p_provider text,
  p_model text,
  p_secret_name text,
  p_secret_value text
)
returns void
language plpgsql
security definer set search_path = public, vault
as $$
declare
  v_role text;
  v_existing_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Only admins can configure API keys';
  end if;

  select id into v_existing_id from vault.secrets where name = p_secret_name;
  if v_existing_id is not null then
    perform vault.update_secret(v_existing_id, p_secret_value);
  else
    perform vault.create_secret(p_secret_value, p_secret_name, 'MCQ system provider key');
  end if;

  insert into public.app_settings (key, vault_secret_name, provider, model, is_configured, updated_by, updated_at)
  values (p_setting_key, p_secret_name, p_provider, p_model, true, auth.uid(), now())
  on conflict (key) do update
    set vault_secret_name = excluded.vault_secret_name,
        provider = excluded.provider,
        model = excluded.model,
        is_configured = true,
        updated_by = excluded.updated_by,
        updated_at = now();
end;
$$;

revoke all on function public.admin_set_api_key from public;
grant execute on function public.admin_set_api_key to authenticated;

-- Fuzzy-match a question against all others to find likely duplicates/repeats
-- (used at import-confirm time and for the "Repeated" smart list).
create or replace function public.find_similar_questions(p_question_id uuid, p_threshold real default 0.55)
returns table(id uuid, similarity real)
language sql stable
as $$
  select q2.id, similarity(q1.normalized_text, q2.normalized_text) as similarity
  from public.questions q1, public.questions q2
  where q1.id = p_question_id and q2.id <> p_question_id
    and similarity(q1.normalized_text, q2.normalized_text) > p_threshold
  order by similarity desc
  limit 5;
$$;

grant execute on function public.find_similar_questions to authenticated;

-- ---------------------------------------------------------------------------
-- Views: analytics / smart-learning helpers
-- ---------------------------------------------------------------------------

-- Per-user, per-subject performance (accuracy, attempts, weak-topic signal)
create or replace view public.v_user_subject_performance as
select
  ua.user_id,
  q.subject_id,
  s.name as subject_name,
  count(*) as questions_answered,
  count(*) filter (where aa.is_correct) as correct,
  count(*) filter (where aa.is_correct = false) as wrong,
  round(100.0 * count(*) filter (where aa.is_correct) / nullif(count(*), 0), 1) as accuracy_percent
from public.attempt_answers aa
join public.user_attempts ua on ua.id = aa.attempt_id
join public.questions q on q.id = aa.question_id
left join public.subjects s on s.id = q.subject_id
group by ua.user_id, q.subject_id, s.name;

-- Mistake notebook: questions a user has ever gotten wrong, most recent first,
-- with how many times they've missed it.
create or replace view public.v_mistake_notebook as
select
  ua.user_id,
  aa.question_id,
  count(*) as times_wrong,
  max(aa.created_at) as last_wrong_at
from public.attempt_answers aa
join public.user_attempts ua on ua.id = aa.attempt_id
where aa.is_correct = false
group by ua.user_id, aa.question_id;

-- Frequently-repeated questions across all imported papers (by fuzzy-matched
-- normalized text), useful for "Most Important / Repeated" lists.
create or replace view public.v_repeated_questions as
select normalized_text, count(*) as occurrence_count, array_agg(id) as question_ids
from public.questions
group by normalized_text
having count(*) > 1;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.papers enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.explanations enable row level security;
alter table public.sources enable row level security;
alter table public.user_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notes enable row level security;
alter table public.app_settings enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid());

-- reference tables: readable by any signed-in user; writable by admins only
drop policy if exists "orgs_read" on public.organizations;
create policy "orgs_read" on public.organizations for select using (auth.uid() is not null);
drop policy if exists "orgs_write_admin" on public.organizations;
create policy "orgs_write_admin" on public.organizations for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "subjects_read" on public.subjects;
create policy "subjects_read" on public.subjects for select using (auth.uid() is not null);
drop policy if exists "subjects_write_admin" on public.subjects;
create policy "subjects_write_admin" on public.subjects for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "topics_read" on public.topics;
create policy "topics_read" on public.topics for select using (auth.uid() is not null);
drop policy if exists "topics_write_admin" on public.topics;
create policy "topics_write_admin" on public.topics for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- papers: owner full access; everyone signed-in can read imported papers; admins see/manage all
drop policy if exists "papers_select" on public.papers;
create policy "papers_select" on public.papers for select
  using (
    uploaded_by = auth.uid()
    or status = 'imported'
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "papers_insert_own" on public.papers;
create policy "papers_insert_own" on public.papers for insert
  with check (uploaded_by = auth.uid());
drop policy if exists "papers_update_own_or_admin" on public.papers;
create policy "papers_update_own_or_admin" on public.papers for update
  using (uploaded_by = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "papers_delete_own_or_admin" on public.papers;
create policy "papers_delete_own_or_admin" on public.papers for delete
  using (uploaded_by = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- questions / options / explanations / sources: visible if the parent paper is visible
drop policy if exists "questions_select" on public.questions;
create policy "questions_select" on public.questions for select
  using (exists (
    select 1 from public.papers pa where pa.id = questions.paper_id
      and (pa.uploaded_by = auth.uid() or pa.status = 'imported'
           or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));
drop policy if exists "questions_write_owner_or_admin" on public.questions;
create policy "questions_write_owner_or_admin" on public.questions for all
  using (exists (
    select 1 from public.papers pa where pa.id = questions.paper_id
      and (pa.uploaded_by = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));

drop policy if exists "options_select" on public.options;
create policy "options_select" on public.options for select
  using (exists (
    select 1 from public.questions q join public.papers pa on pa.id = q.paper_id
    where q.id = options.question_id
      and (pa.uploaded_by = auth.uid() or pa.status = 'imported'
           or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));
drop policy if exists "options_write_owner_or_admin" on public.options;
create policy "options_write_owner_or_admin" on public.options for all
  using (exists (
    select 1 from public.questions q join public.papers pa on pa.id = q.paper_id
    where q.id = options.question_id
      and (pa.uploaded_by = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));

drop policy if exists "explanations_select" on public.explanations;
create policy "explanations_select" on public.explanations for select
  using (exists (
    select 1 from public.questions q join public.papers pa on pa.id = q.paper_id
    where q.id = explanations.question_id
      and (pa.uploaded_by = auth.uid() or pa.status = 'imported'
           or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));
drop policy if exists "explanations_write_owner_or_admin" on public.explanations;
create policy "explanations_write_owner_or_admin" on public.explanations for all
  using (exists (
    select 1 from public.questions q join public.papers pa on pa.id = q.paper_id
    where q.id = explanations.question_id
      and (pa.uploaded_by = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));

drop policy if exists "sources_select" on public.sources;
create policy "sources_select" on public.sources for select
  using (exists (
    select 1 from public.questions q join public.papers pa on pa.id = q.paper_id
    where q.id = sources.question_id
      and (pa.uploaded_by = auth.uid() or pa.status = 'imported'
           or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));
drop policy if exists "sources_write_owner_or_admin" on public.sources;
create policy "sources_write_owner_or_admin" on public.sources for all
  using (exists (
    select 1 from public.questions q join public.papers pa on pa.id = q.paper_id
    where q.id = sources.question_id
      and (pa.uploaded_by = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  ));

-- attempts / attempt answers / bookmarks / notes: strictly own-data
drop policy if exists "attempts_owner" on public.user_attempts;
create policy "attempts_owner" on public.user_attempts for all using (user_id = auth.uid());

drop policy if exists "attempt_answers_owner" on public.attempt_answers;
create policy "attempt_answers_owner" on public.attempt_answers for all
  using (exists (select 1 from public.user_attempts ua where ua.id = attempt_answers.attempt_id and ua.user_id = auth.uid()));

drop policy if exists "bookmarks_owner" on public.bookmarks;
create policy "bookmarks_owner" on public.bookmarks for all using (user_id = auth.uid());

drop policy if exists "notes_owner" on public.notes;
create policy "notes_owner" on public.notes for all using (user_id = auth.uid());

-- app_settings: admins only, and only non-secret metadata is ever exposed here
drop policy if exists "app_settings_admin_only" on public.app_settings;
create policy "app_settings_admin_only" on public.app_settings for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded papers (private; accessed via signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('papers', 'papers', false)
on conflict (id) do nothing;

drop policy if exists "papers_storage_owner_read" on storage.objects;
create policy "papers_storage_owner_read" on storage.objects for select
  using (bucket_id = 'papers' and (owner = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')));

drop policy if exists "papers_storage_owner_write" on storage.objects;
create policy "papers_storage_owner_write" on storage.objects for insert
  with check (bucket_id = 'papers' and owner = auth.uid());

drop policy if exists "papers_storage_owner_delete" on storage.objects;
create policy "papers_storage_owner_delete" on storage.objects for delete
  using (bucket_id = 'papers' and (owner = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')));

-- ============================================================================
-- Done. Next: Supabase → Authentication → enable Email provider, then set
-- your Netlify environment variables (see .env.example) and deploy.
-- ============================================================================
