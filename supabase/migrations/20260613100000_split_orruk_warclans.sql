-- 4th edition split the Orruk Warclans battletome into two separate playable
-- factions: Ironjawz and Kruleboyz. "Orruk Warclans" itself is no longer a
-- selectable army, so it goes inactive — hidden from new-game and event
-- dropdowns, kept for already-logged games and stats.
-- Colors are original lore-adjacent picks, not GW IP.

insert into public.factions (name, grand_alliance, color_hex, sort_order) values
  ('Ironjawz',  'Destruction', '#caa53d', 202),
  ('Kruleboyz', 'Destruction', '#5e7d4f', 204);

update public.factions set active = false where name = 'Orruk Warclans';
