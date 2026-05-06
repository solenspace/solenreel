-- Spec 14 — public.events + append-only RLS + cascade.
-- Events are per-user click/hover/trailer telemetry feeding the recommender;
-- append-only is enforced by the absence of update/delete policies.

create type public.event_kind as enum (
  'tile_click',
  'hover_start',
  'trailer_play',
  'trailer_complete'
);

create table public.events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.event_kind not null,
  tmdb_id integer not null
    constraint events_tmdb_id_positive check (tmdb_id > 0),
  payload jsonb not null default '{}'::jsonb
    constraint events_payload_size_check check (pg_column_size(payload) < 4096),
  created_at timestamptz not null default now()
);

create index events_user_id_created_at_desc
  on public.events (user_id, created_at desc);

create index events_user_id_tmdb_id
  on public.events (user_id, tmdb_id);

alter table public.events enable row level security;

create policy events_select_own
  on public.events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy events_insert_own
  on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- No update or delete policy: events are append-only. RLS denies both verbs
-- by default; cleanup happens via on-delete-cascade from auth.users.
