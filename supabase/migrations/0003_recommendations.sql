-- Spec 16 — public.recommendations + read-only-by-client RLS + items cap.
-- Caches each user's most recent recommendation list as computed by the
-- spec-17 Edge Function. Clients read their own row; only the service role
-- (bypassing RLS, used inside Edge Functions) inserts/updates/deletes.

create table public.recommendations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb
    constraint recommendations_items_cap check (jsonb_array_length(items) <= 50),
  computed_at timestamptz not null default now(),
  computed_from_event_count integer not null default 0
);

alter table public.recommendations enable row level security;

create policy recommendations_select_own
  on public.recommendations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update/delete policy: only the service role (used inside Edge
-- Functions) writes to this table; the service role bypasses RLS. Clients
-- are read-only. Cleanup happens via on-delete-cascade from auth.users.
