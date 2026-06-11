-- This project does not auto-grant table privileges to API roles, so RLS
-- policies alone return "permission denied". Grant base table access to
-- `authenticated` (row filtering stays with RLS); `anon` deliberately gets
-- nothing — every part of the app sits behind login.

grant select on public.factions to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.games to authenticated;
grant select, insert, update, delete on public.proficiency_adjustments to authenticated;
grant select, insert, update, delete on public.unit_profiles to authenticated;
grant select, insert, update, delete on public.pairings to authenticated;
grant select on public.player_faction_stats to authenticated;
grant execute on function public.proficiency_level(int, int) to authenticated;

-- service_role (server-side jobs, dashboard tooling) gets full access.
grant all on all tables in schema public to service_role;

-- Future tables in this schema: same posture by default.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
