-- Pairings are made against one opponent team (one battle per team at an
-- event), so key them by the opponent rather than a hand-typed round.
-- `round` stays as the auto-derived sequence (order teams were recorded in).

alter table public.pairings
  add column opponent_id uuid references public.event_opponents (id) on delete cascade;

create index pairings_opponent_id_idx on public.pairings (opponent_id);
