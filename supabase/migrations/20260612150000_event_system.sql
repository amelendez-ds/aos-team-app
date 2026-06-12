-- Phase 2 redesign: event system — opponent teams, our lineup, and player
-- preference rankings per opponent team.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- An opposing team at an event. faction_ids is an array (Postgres cannot FK
-- array elements, so the server action validates the ids against factions).
create table public.event_opponents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  team_name text not null,
  faction_ids uuid[] not null default '{}'
    check (coalesce(array_length(faction_ids, 1), 0) <= 6),
  sort_order int not null default 0
);

create index event_opponents_event_id_idx on public.event_opponents (event_id);

-- What each of our players brings to an event.
create table public.event_player_factions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  faction_id uuid not null references public.factions (id),
  unique (event_id, profile_id)
);

create index event_player_factions_event_id_idx
  on public.event_player_factions (event_id);

-- A player's preference ranking of one opponent team's factions.
-- Lower rank = more preferred matchup.
create table public.event_preferences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid not null references public.event_opponents (id) on delete cascade,
  faction_id uuid not null references public.factions (id),
  preference_rank int not null check (preference_rank between 1 and 6),
  unique (event_id, profile_id, opponent_id, faction_id)
);

create index event_preferences_event_id_idx on public.event_preferences (event_id);
create index event_preferences_profile_id_idx on public.event_preferences (profile_id);
create index event_preferences_opponent_id_idx on public.event_preferences (opponent_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security (same patterns as phase 1)
-- ---------------------------------------------------------------------------
alter table public.event_opponents enable row level security;
alter table public.event_player_factions enable row level security;
alter table public.event_preferences enable row level security;

-- event_opponents: everyone reads; captains and admins manage.
create policy "event_opponents_select_all" on public.event_opponents
  for select to authenticated using (true);
create policy "event_opponents_write_captain" on public.event_opponents
  for all to authenticated
  using (private.is_captain_or_admin())
  with check (private.is_captain_or_admin());

-- event_player_factions: everyone reads the lineup; captains/admins set it.
create policy "event_player_factions_select_all" on public.event_player_factions
  for select to authenticated using (true);
create policy "event_player_factions_write_captain" on public.event_player_factions
  for all to authenticated
  using (private.is_captain_or_admin())
  with check (private.is_captain_or_admin());

-- event_preferences: own CRUD; captains read all; admins everything.
create policy "event_prefs_crud_own" on public.event_preferences
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
create policy "event_prefs_select_captain" on public.event_preferences
  for select to authenticated using (private.is_captain_or_admin());
create policy "event_prefs_all_admin" on public.event_preferences
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- ---------------------------------------------------------------------------
-- Grants (default privileges already cover new tables; explicit for clarity)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.event_opponents to authenticated;
grant select, insert, update, delete on public.event_player_factions to authenticated;
grant select, insert, update, delete on public.event_preferences to authenticated;
