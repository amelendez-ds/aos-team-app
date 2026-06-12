-- Phase 2: team-wide aggregate views.
--
-- Unlike player_faction_stats (security_invoker, caller's RLS), these views
-- run with owner rights and DELIBERATELY bypass RLS on games: /team shows
-- team statistics and roster ranks to every role, but plain players cannot
-- read teammates' raw games. Only derived aggregates are exposed here; raw
-- game rows stay behind RLS.

-- Per-player per-faction stats, visible to the whole team. Same shape as
-- player_faction_stats so the app's rank helpers work on both.
create view public.team_player_faction_stats as
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

-- W-L-D per event for the whole team.
create view public.team_event_results as
select event_id,
       count(*)::int as games_played,
       count(*) filter (where result = 'win')::int as wins,
       count(*) filter (where result = 'loss')::int as losses,
       count(*) filter (where result = 'draw')::int as draws,
       max(played_on) as last_played
from public.games
where event_id is not null
group by event_id;

grant select on public.team_player_faction_stats to authenticated;
grant select on public.team_event_results to authenticated;
