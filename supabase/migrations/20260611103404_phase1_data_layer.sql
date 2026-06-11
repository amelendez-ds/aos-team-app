-- Phase 1: data layer — tables, RLS, triggers, view, faction seed.
-- Spec: AoS-App-Suite-Build-Spec.md §2 (roles), §4 (schema + RLS), §7 (seed).

-- `private` schema: helpers not exposed through PostgREST.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.factions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  grand_alliance text not null
    check (grand_alliance in ('Order', 'Chaos', 'Death', 'Destruction')),
  color_hex text not null,
  active boolean not null default true,
  sort_order int not null default 0
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'player'
    check (role in ('player', 'captain', 'admin')),
  primary_faction_id uuid references public.factions (id),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format text,
  location text,
  start_date date,
  end_date date,
  created_by uuid not null references public.profiles (id),
  notes text
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  player_faction_id uuid not null references public.factions (id),
  opponent_faction_id uuid not null references public.factions (id),
  result text not null check (result in ('win', 'loss', 'draw')),
  score_self int,
  score_opp int,
  event_id uuid references public.events (id) on delete set null,
  played_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  last_edited_by uuid references public.profiles (id)
);

create index games_owner_id_idx on public.games (owner_id);
create index games_player_faction_id_idx on public.games (player_faction_id);
create index games_opponent_faction_id_idx on public.games (opponent_faction_id);
create index games_event_id_idx on public.games (event_id);

create table public.proficiency_adjustments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  faction_id uuid not null references public.factions (id),
  axis text not null check (axis in ('playing', 'against')),
  manual_delta int not null default 0,
  updated_at timestamptz not null default now(),
  unique (profile_id, faction_id, axis)
);

create table public.unit_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  attacks text not null,
  to_hit int not null check (to_hit between 2 and 6),
  to_wound int not null check (to_wound between 2 and 6),
  rend int not null default 0,
  damage text not null,
  modifiers jsonb not null default '{}',
  faction_id uuid references public.factions (id)
);

create index unit_profiles_owner_id_idx on public.unit_profiles (owner_id);

create table public.pairings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  round int not null,
  our_player_id uuid not null references public.profiles (id),
  opp_faction_id uuid not null references public.factions (id),
  opp_player_name text,
  result text check (result in ('win', 'loss', 'draw'))
);

create index pairings_event_id_idx on public.pairings (event_id);
create index pairings_our_player_id_idx on public.pairings (our_player_id);

-- ---------------------------------------------------------------------------
-- Role helpers
-- SECURITY DEFINER so profile lookups inside RLS policies on `profiles`
-- itself don't recurse. Defined after the tables they reference because
-- LANGUAGE sql bodies are validated at creation time.
-- ---------------------------------------------------------------------------
create or replace function private.role_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = uid;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.role_of((select auth.uid())) = 'admin';
$$;

create or replace function private.is_captain_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.role_of((select auth.uid())) in ('captain', 'admin');
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Auto-create a profile on signup. The owner's email gets the admin seat.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    case when new.email = 'alvaromegu90@gmail.com' then 'admin' else 'player' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Only admins may change roles. RLS WITH CHECK cannot compare OLD vs NEW,
-- so the guard lives in a trigger.
create or replace function private.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role_change
  before update on public.profiles
  for each row execute function private.guard_role_change();

-- Stamp every games update with the editor; the UI shows "edited by admin"
-- whenever last_edited_by differs from owner_id.
create or replace function private.stamp_last_edited_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.last_edited_by := (select auth.uid());
  return new;
end;
$$;

create trigger games_stamp_last_edited_by
  before update on public.games
  for each row execute function private.stamp_last_edited_by();

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger proficiency_adjustments_touch_updated_at
  before insert or update on public.proficiency_adjustments
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Proficiency level + stats view
-- ---------------------------------------------------------------------------

-- Placeholder formula (spec §10 leaves the exact curve open): level grows
-- with the square root of games played, nudged by the manual delta.
create or replace function public.proficiency_level(game_count int, manual_delta int)
returns int
language sql
immutable
set search_path = ''
as $$
  select greatest(0, floor(sqrt(greatest(game_count, 0)))::int + manual_delta);
$$;

-- security_invoker: the view reads `games` under the caller's RLS, so players
-- see their own stats and captains/admins see everyone's.
create view public.player_faction_stats
with (security_invoker = on)
as
with per_axis as (
  select owner_id as profile_id, player_faction_id as faction_id,
         'playing' as axis, result, played_on
  from public.games
  union all
  select owner_id, opponent_faction_id, 'against', result, played_on
  from public.games
),
agg as (
  select profile_id, faction_id, axis,
         count(*)::int as games_played,
         count(*) filter (where result = 'win')::int as wins,
         count(*) filter (where result = 'loss')::int as losses,
         count(*) filter (where result = 'draw')::int as draws,
         round(count(*) filter (where result = 'win')::numeric
               / count(*), 3) as win_rate,
         max(played_on) as last_played
  from per_axis
  group by profile_id, faction_id, axis
)
select agg.*,
       coalesce(pa.manual_delta, 0) as manual_delta,
       public.proficiency_level(agg.games_played, coalesce(pa.manual_delta, 0)) as level
from agg
left join public.proficiency_adjustments pa
  on pa.profile_id = agg.profile_id
 and pa.faction_id = agg.faction_id
 and pa.axis = agg.axis;

-- ---------------------------------------------------------------------------
-- Row-Level Security (spec §4 matrix)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.factions enable row level security;
alter table public.events enable row level security;
alter table public.games enable row level security;
alter table public.proficiency_adjustments enable row level security;
alter table public.unit_profiles enable row level security;
alter table public.pairings enable row level security;

-- profiles: everyone reads the roster; players update their own row
-- (role change blocked by trigger); admins update anyone.
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- factions: shared reference data; admins maintain it.
create policy "factions_select_all" on public.factions
  for select to authenticated using (true);
create policy "factions_write_admin" on public.factions
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- games: own CRUD; captains read all; admins everything.
create policy "games_crud_own" on public.games
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "games_select_captain" on public.games
  for select to authenticated using (private.is_captain_or_admin());
create policy "games_all_admin" on public.games
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- proficiency_adjustments: same shape as games.
create policy "prof_adj_crud_own" on public.proficiency_adjustments
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
create policy "prof_adj_select_captain" on public.proficiency_adjustments
  for select to authenticated using (private.is_captain_or_admin());
create policy "prof_adj_all_admin" on public.proficiency_adjustments
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- unit_profiles: same shape as games.
create policy "unit_profiles_crud_own" on public.unit_profiles
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "unit_profiles_select_captain" on public.unit_profiles
  for select to authenticated using (private.is_captain_or_admin());
create policy "unit_profiles_all_admin" on public.unit_profiles
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- events: players read; captains and admins manage.
create policy "events_select_all" on public.events
  for select to authenticated using (true);
create policy "events_write_captain" on public.events
  for all to authenticated
  using (private.is_captain_or_admin())
  with check (private.is_captain_or_admin());

-- pairings: players see their own assignments; captains and admins manage.
create policy "pairings_select_own" on public.pairings
  for select to authenticated using (our_player_id = (select auth.uid()));
create policy "pairings_all_captain" on public.pairings
  for all to authenticated
  using (private.is_captain_or_admin())
  with check (private.is_captain_or_admin());

-- ---------------------------------------------------------------------------
-- Faction seed (spec §7, AoS 4th edition) — grouped by grand alliance,
-- alphabetical within. Colors are original, lore-adjacent picks; not GW IP.
-- ---------------------------------------------------------------------------
insert into public.factions (name, grand_alliance, color_hex, sort_order) values
  ('Cities of Sigmar',        'Order',       '#b0413e', 10),
  ('Daughters of Khaine',     'Order',       '#9e2a2b', 20),
  ('Fyreslayers',             'Order',       '#e25822', 30),
  ('Idoneth Deepkin',         'Order',       '#2e8b8b', 40),
  ('Kharadron Overlords',     'Order',       '#b08d57', 50),
  ('Lumineth Realm-lords',    'Order',       '#cfc393', 60),
  ('Seraphon',                'Order',       '#4a7ebb', 70),
  ('Stormcast Eternals',      'Order',       '#d9a72e', 80),
  ('Sylvaneth',               'Order',       '#4e7a3a', 90),
  ('Blades of Khorne',        'Chaos',       '#8a0f0f', 100),
  ('Disciples of Tzeentch',   'Chaos',       '#3b7dd8', 110),
  ('Hedonites of Slaanesh',   'Chaos',       '#b05fa3', 120),
  ('Maggotkin of Nurgle',     'Chaos',       '#6a7d2a', 130),
  ('Skaven',                  'Chaos',       '#57a639', 140),
  ('Slaves to Darkness',      'Chaos',       '#4a4a58', 150),
  ('Flesh-eater Courts',      'Death',       '#a8a17c', 160),
  ('Nighthaunt',              'Death',       '#69c0b2', 170),
  ('Ossiarch Bonereapers',    'Death',       '#cfc6a5', 180),
  ('Soulblight Gravelords',   'Death',       '#7c1f3f', 190),
  ('Gloomspite Gitz',         'Destruction', '#7b4ea3', 200),
  ('Ogor Mawtribes',          'Destruction', '#b3713f', 210),
  ('Orruk Warclans',          'Destruction', '#4c9141', 220),
  ('Sons of Behemat',         'Destruction', '#8d6e4a', 230);
