# Age of Sigmar Team App Suite — Build Specification

**Purpose:** A single web app holding a suite of tools for an Age of Sigmar team: damage calculation, per-player proficiency tracking, and team statistics for events. This document is the handoff package to paste into Claude Fable 5, one module at a time.

**Assumptions made (adjust if wrong):**
- Team size is small-to-medium (up to ~30 players). Schema scales well beyond this regardless.
- Private, login-gated tool for one team. Not public, not commercial.
- Built and extended incrementally; further updates done later by the owner.

---

## 1. Guiding principles

1. **One backbone, many tools.** Players, factions, and games are shared data. The proficiency tracker and team stats are two views of the same game records. Build the data layer first.
2. **Users enter their own data.** No maintained rules/points database. Unit profiles for the damage calculator are user-entered. This is what keeps the app low-maintenance.
3. **No Games Workshop assets.** Do not ship GW's fonts, logos, official artwork, or miniature photography. Achieve the "premium codex" feel through original design (see §6). Faction *names* are used descriptively, which is fine. Players may upload photos of *their own* painted models behind the login.
4. **Security lives in the database.** Access rules are enforced via Supabase Row-Level Security, not just hidden UI.

---

## 2. Roles & access model

Three roles, hierarchical (each higher role is a superset of the one below):

| Role | Who | Can do |
|------|-----|--------|
| `player` | Every team member | Create/read/update/delete **their own** games, unit profiles, and proficiency adjustments. Read the team roster and the shared factions list. |
| `captain` | The team captain (not the owner) | Everything a player can, **plus** read all players' games and proficiencies, manage events, and use the matchmaking/pairing tool. Cannot edit other players' raw data or change roles. |
| `admin` | The owner (you) | Full control. Everything captain can do, **plus** edit or delete any player's data, assign roles, and act in the captain's seat. |

Notes:
- The owner is `admin`, distinct from `captain`. The captain seat exists for the person actually captaining; admin can access and operate it but is not the captain by default.
- Any master/admin edit to another user's record should leave a visible "edited by admin" stamp for team trust.

---

## 3. Tech stack

- **Next.js (React, App Router)** — single app, each tool a route/module.
- **Supabase** — Postgres database, Auth (email + Google sign-in), Row-Level Security, file storage (for mini photos).
- **Vercel** — hosting, auto-deploy from GitHub on every push.
- **Tailwind CSS** + self-hosted Google Fonts for the design system.

Rationale: all four are heavily represented in training data, so Fable 5 will produce idiomatic, high-quality code, and all integrate with GitHub out of the box.

---

## 4. Data model (Postgres / Supabase)

### Tables

**profiles** — one row per auth user
- `id` uuid (PK, references auth.users)
- `display_name` text
- `role` text — one of `player`, `captain`, `admin` (default `player`)
- `primary_faction_id` uuid (FK → factions, nullable)
- `avatar_url` text (nullable)
- `created_at` timestamptz default now()

**factions** — reference data (seed in §7)
- `id` uuid (PK)
- `name` text
- `grand_alliance` text — `Order`, `Chaos`, `Death`, `Destruction`
- `color_hex` text — accent color for UI
- `active` boolean default true
- `sort_order` int

**events** — team events / tournaments
- `id` uuid (PK)
- `name` text
- `format` text (e.g. "5-man team", "doubles")
- `location` text (nullable)
- `start_date` date, `end_date` date (nullable)
- `created_by` uuid (FK → profiles)
- `notes` text (nullable)

**games** — the central record; feeds proficiency and stats
- `id` uuid (PK)
- `owner_id` uuid (FK → profiles) — who logged/played it
- `player_faction_id` uuid (FK → factions) — the faction the owner played
- `opponent_faction_id` uuid (FK → factions) — the faction faced
- `result` text — `win`, `loss`, `draw`
- `score_self` int (nullable), `score_opp` int (nullable)
- `event_id` uuid (FK → events, nullable)
- `played_on` date
- `notes` text (nullable)
- `created_at` timestamptz default now()
- `last_edited_by` uuid (FK → profiles, nullable) — stamp for admin edits

**proficiency_adjustments** — manual level nudges (the "level increase players can input")
- `id` uuid (PK)
- `profile_id` uuid (FK → profiles)
- `faction_id` uuid (FK → factions)
- `axis` text — `playing` (experience with this faction) or `against` (experience facing it)
- `manual_delta` int — manual adjustment added on top of auto-derived level
- `updated_at` timestamptz

**unit_profiles** — user-entered profiles for the damage calculator
- `id` uuid (PK)
- `owner_id` uuid (FK → profiles)
- `name` text
- `attacks` text — supports fixed or dice (e.g. "4", "D6")
- `to_hit` int (e.g. 3 means 3+), `to_wound` int
- `rend` int (e.g. -1)
- `damage` text (e.g. "1", "D3")
- `modifiers` jsonb — rerolls, +/- to hit/wound, crit effects, mortal wounds, ward, etc.
- `faction_id` uuid (FK → factions, nullable)

**pairings** — Phase 2, captain's matchmaking record (optional until Phase 2)
- `id` uuid (PK)
- `event_id` uuid (FK → events)
- `round` int
- `our_player_id` uuid (FK → profiles)
- `opp_faction_id` uuid (FK → factions)
- `opp_player_name` text (nullable)
- `result` text (nullable)

### Derived view: `player_faction_stats`
A SQL view aggregating `games` per (owner_id, opponent_faction_id) and per (owner_id, player_faction_id): games count, wins, losses, draws, win rate, last-played date. Proficiency level = function(auto game count, optional recency weighting) + `manual_delta` from proficiency_adjustments.

### Row-Level Security policies

| Table | player | captain | admin |
|-------|--------|---------|-------|
| profiles | read all; update own (not role) | read all | read/update all incl. role |
| factions | read | read | read/write |
| games | full CRUD on own | read all | full CRUD on all |
| proficiency_adjustments | full CRUD on own | read all | full CRUD on all |
| unit_profiles | full CRUD on own | read all | full CRUD on all |
| events | read | full CRUD | full CRUD |
| pairings | read own | full CRUD | full CRUD |

Enforce roles by checking the caller's `profiles.role` inside the RLS policy. Role changes restricted to `admin`.

---

## 5. Tool specifications

Build in this order. Get each working and committed before the next.

### Phase 1 — Data layer + Game Logging + Proficiency Tracker
The foundation and the first genuinely useful tool.

**Game logging:** a player logs a game — their faction, opponent faction, result, optional score, optional event, date, notes. Lists their own game history; can edit/delete own entries.

**Proficiency Tracker:** per player, two axes — experience *playing* each faction (their own armies) and experience *facing* each faction (matchup knowledge). Shows game counts, win rate per matchup, and a proficiency level that auto-increments with games and can be manually nudged (the player, or admin, adds a `manual_delta`). Optional recency weighting so stale matchups read as less current. A roster view shows the whole team's proficiencies (captain/admin).

### Phase 2 — Team Statistics + Matchmaking (Captain tool)
The captain's high-value feature.

**Team stats:** aggregate win rates, per-faction strengths/weaknesses across the team, results by event, season standings across multiple events, a "meta" view of which factions the team struggles into.

**Pairing helper:** given the opposing team's factions for a round, surface each of your players' proficiency and win rate into those factions, and propose an optimal assignment (an assignment-problem solver — e.g. Hungarian algorithm — maximizing expected team score), which the captain can override. Record pairings per round/event.

### Phase 3 — Average Damage Calculator
Most self-contained; can be built in a parallel session.

**Core:** the AoS attack sequence — Attacks → hit roll → wound roll → save (modified by Rend) → Ward → Damage per unsaved wound. Compute average damage.
**Modifiers:** reroll 1s / reroll all (hit and wound), +1/-1 to hit and wound, Rend, crit effects (Crit Mortal, Crit 2 Hits, Crit Auto-wound), mortal wounds bypassing saves, variable damage (D3, D6 use expected value; D3=2, D6=3.5).
**High-value extras:** a damage-vs-save curve (expected damage against 2+ through 6+/no-save in one view); a distribution / "chance to deal ≥ X damage" (simulation or convolution); saved unit profiles from `unit_profiles`; side-by-side compare of two attacking units.

---

## 6. Design system (the "premium" feel, without GW assets)

**Principle restated:** no GW fonts, logos, official art, or mini photos. Build the aesthetic originally.

**Typography (free, self-hostable Google Fonts):**
- Display / headers: **Cinzel** (engraved Roman caps — reads epic and official).
- Body: **EB Garamond** (or **Spectral**) — elegant, readable serif.
- Optional dark accent, used sparingly: **UnifrakturCook** (blackletter) for grimdark flourishes.

**Palette (CSS variables):**
```css
:root {
  --bg: #14110f;          /* near-black, warm */
  --surface: #1e1a16;     /* card backgrounds */
  --parchment: #e8dcc0;   /* light text panels */
  --text: #ece6da;
  --muted: #9b9183;
  --accent-gold: #c9a24b; /* primary accent, borders, headings */
  --accent-bronze: #8a6d3b;
  --win: #4f9d69;
  --loss: #b4513f;
}
```
**Visual treatment:** dark textured backgrounds (CC0 parchment/stone/metal textures only), gold/bronze accents and ornamental dividers (original or CC0 SVG flourishes), card-based layout, strong type hierarchy.

**Faction identity:** each faction gets a color identity (in `factions.color_hex`) and an **original** icon — commissioned or generated, never GW's runes/logos. Colors are not IP.

**Army imagery:** no official art. Let each player upload photos of *their own* painted models to their profile (Supabase storage), gated behind login, not public.

---

## 7. Factions seed data (current 4th edition)

Editable reference data — update as GW revises the roster.

**Order (9):** Stormcast Eternals, Cities of Sigmar, Daughters of Khaine, Fyreslayers, Idoneth Deepkin, Kharadron Overlords, Lumineth Realm-lords, Seraphon, Sylvaneth.

**Chaos (6):** Blades of Khorne, Disciples of Tzeentch, Hedonites of Slaanesh, Maggotkin of Nurgle, Skaven, Slaves to Darkness.

**Death (4):** Flesh-eater Courts, Nighthaunt, Ossiarch Bonereapers, Soulblight Gravelords.

**Destruction (4):** Gloomspite Gitz, Ogor Mawtribes, Orruk Warclans, Sons of Behemat.

*(Beasts of Chaos and Bonesplitterz were moved to Legends/sunset June 2025 and are excluded from active play.)*

---

## 8. Working with Fable 5

- Build **module by module**, not all at once. Hand over one tool's spec, get it working, commit, move on.
- Start with the **data layer + RLS** (paste §2 and §4), then Phase 1 tools, then design pass, then Phases 2 and 3.
- After each working module, commit to GitHub so you always have a clean rollback point.
- Keep the no-GW-assets rule and the role model in every prompt so they stay consistent across sessions.

---

## 9. Deployment

1. Create a **GitHub repo** (private, since it holds real people's records).
2. Create a **Supabase project**; run the schema SQL (§4) and seed the factions (§7); configure Auth (email + Google).
3. Connect **Vercel** to the GitHub repo for auto-deploy on push.
4. Set Vercel environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Every push to `main` redeploys automatically. Enable Supabase point-in-time backups for the database.

All three services have free tiers suitable for a team-sized app; confirm current limits when you sign up.

---

## 10. Open items to refine later

- Exact proficiency formula and whether to apply recency weighting.
- How many players per team in the pairing tool, and your event format (affects the matchmaking UI).
- Whether unit profiles should be shareable across the team or private to each player.
- Commissioning vs generating the per-faction icons.
