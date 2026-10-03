-- One row per season result, written only by the analyze route with the server's secret key.
-- No photo, crop or contact detail is stored. Rows from previews, local runs and CI are is_test.
-- openspec/specs/season-reveal/spec.md

create table public.reports (
  id text primary key,                -- 16 random bytes, base64url (22 chars)
  created_at timestamptz not null default now(),
  season text not null,
  runner_up text not null,
  confidence numeric(3, 2) not null,
  agreement text not null,
  traits jsonb not null,
  answers jsonb not null,
  photo_verdict text,                 -- null: quiz-only, or no model call judged the photo
  text_source text not null,          -- personal | capped | cap-unavailable | failed | timeout | invalid | quiz-only
  summary text,                       -- personal only
  agreement_note text,                -- personal only
  is_test boolean not null
);

-- RLS with no policies, and Supabase's default grants on public revoked, so only the server's
-- role reads and writes.
alter table public.reports enable row level security;
revoke all on public.reports from public, anon, authenticated;
grant select, insert on public.reports to service_role;
