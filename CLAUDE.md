@AGENTS.md

# CLAUDE.md — Age of Sigmar Team App Suite

Project rules and context. Loaded every session — keep this concise.
Full detail lives in `AoS-App-Suite-Build-Spec.md`; read it when starting a module.

## What we're building
A single private web app for one Age of Sigmar team (max ~10 players) holding a
suite of tools that share one data backbone:
- Game logging + per-player Proficiency Tracker (Phase 1)
- Team Statistics + Captain matchmaking/pairing helper (Phase 2)
- Average Damage Calculator (Phase 3)

Build in phase order. Get one module working and committed before the next.

## Stack (do not substitute without asking)
- Next.js (React, App Router) — one app, each tool a route/module
- Supabase — Postgres, Auth (email + Google), Row-Level Security, file storage
- Vercel — hosting, auto-deploy from GitHub on push
- Tailwind CSS + self-hosted Google Fonts

## Roles & access (load-bearing — enforce in the database, not just UI)
Three roles, each a superset of the one below:
- `player` — full CRUD on their OWN games, unit profiles, proficiency adjustments;
  read the team roster and factions list.
- `captain` — all player rights, PLUS read all players' games/proficiencies,
  manage events, and use the pairing tool. Cannot edit others' raw data or roles.
- `admin` — the owner. Full control: edit/delete any data, assign roles, act as captain.

Enforce via Supabase Row-Level Security checking `profiles.role`. Role changes:
admin only. Any admin edit to another user's record must leave a visible
"last edited by admin" stamp.

## Core principles
1. ONE backbone, many tools. `players`, `factions`, `games` are shared. Proficiency
   and team stats are views of the same game records. Build the data layer first.
2. USERS enter their own data. No maintained rules/points database. Damage-calculator
   unit profiles are user-entered. This keeps the app low-maintenance.
3. SECURITY lives in the database (RLS), never only in the interface.
4. Mobile-first. People use phones at tournament venues.

## Intellectual property — strict
- NO Games Workshop assets: no GW fonts, logos, official artwork, or miniature
  photography. This is non-negotiable.
- Faction NAMES are fine (used descriptively to identify the game).
- Achieve the premium look with original design (see Design below).
- Players may upload photos of THEIR OWN painted models, behind login, never public.

## Design tokens
- Display/headers: Cinzel. Body: EB Garamond. Sparing dark accent: UnifrakturCook.
  All free Google Fonts, self-hosted.
- Palette (CSS variables): --bg #14110f, --surface #1e1a16, --parchment #e8dcc0,
  --text #ece6da, --muted #9b9183, --accent-gold #c9a24b, --accent-bronze #8a6d3b,
  --win #4f9d69, --loss #b4513f.
- Dark textured backgrounds (CC0 textures only), gold/bronze accents, ornamental
  dividers (original/CC0 SVG), card-based layout, strong type hierarchy.
- Each faction has a color identity (`factions.color_hex`) and an ORIGINAL icon —
  never GW runes/logos.

## Data model
See `AoS-App-Suite-Build-Spec.md` §4 for full tables, columns, and RLS policies.
Central table is `games` (carries `owner_id`). Proficiency = auto-derived game
counts (a SQL view) + manual `manual_delta` adjustments. Don't duplicate the schema
here — read the spec.

## Domain: team events
At a team event we play ONE battle against each opposing team. There are no
repeat rounds vs the same team; the round sequence emerges from results.
Pairings are therefore keyed by (event, opponent team) — never ask the
captain for a round number; derive it from recording order.

## Commands
- `npm run dev` — local dev server (test every module here before committing)
- `npm run build` — production build (must pass before deploy)
- `npm run lint` — lint
Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Workflow
- Build module by module; commit to git after each working module.
- Run `npm run dev` and verify in the browser before committing.
- Keep changes reviewable — propose a plan before large multi-file edits.

## Don't
- Don't substitute the stack or add heavy dependencies without asking.
- Don't ship any Games Workshop font, logo, artwork, or mini photo.
- Don't hardcode unit stats or points — those are user-entered.
- Don't put access control only in the UI; it must be enforced by RLS.
- Don't use browser localStorage/sessionStorage for real data — use Supabase.
- Don't build multiple phases at once. One module, tested, committed, then next.
- Don't make uploaded mini photos public.
- Don't rely on RLS to scope "my data" queries. Captains/admins can read
  everyone's rows, so any page showing the viewer's own data must filter
  explicitly (`owner_id`/`profile_id` = current user). RLS is the security
  floor, not the page filter.
- When I correct a mistake, add a rule to this file so it doesn't recur.
