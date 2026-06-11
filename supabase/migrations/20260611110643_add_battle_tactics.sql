-- Optional per-side count of battle tactics scored in a game.

alter table public.games
  add column battle_tactics_self int check (battle_tactics_self >= 0),
  add column battle_tactics_opp int check (battle_tactics_opp >= 0);
