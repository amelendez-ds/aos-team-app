# Age of Sigmar Team App

![100% Vibe Coded](https://img.shields.io/badge/built-100%25%20vibe--coded-8b5cf6)

A private web app for a single Age of Sigmar team (~10 players). One login, one
data backbone, several tools built on top of it: game logging, a per-player
proficiency tracker, team statistics, and a captain's matchmaking helper for
team events.

It is built to be low-maintenance: **players enter their own data**. There is no
maintained rules, points, or unit database to keep in sync with the game.

## How this was built
 
This app was built through AI-assisted "vibe coding": describing what I wanted
in plain language and iterating with an LLM rather than writing most of the
code by hand. Worth being upfront about the trade-offs that come with that:
 
- **Security is not vibes-based.** Every access rule is enforced by Postgres
  Row-Level Security policies in the database, not by trusting the
  AI-generated frontend code to behave correctly. That separation was a
  deliberate design choice, precisely because generated UI code isn't
  something to rely on for auth.
- **Review is uneven.** Some parts of this codebase have been read closely and
  reworked by hand; other parts haven't been touched since they were
  generated. They work, but "generated and working" isn't the same as
  "idiomatic."
- **This is a hobby project for ~10 people**, not something built to
  production-engineering standards. If something in the code looks odd, that's
  probably why.

## Stack

- [Next.js](https://nextjs.org) (App Router, React 19)
- [Supabase](https://supabase.com) — Postgres, Auth (email + Google), Row-Level
  Security, storage
- Tailwind CSS
- Deployed on Vercel

## Roles

Three roles, each a superset of the one below. They are enforced by Postgres
Row-Level Security, not just by the interface.

| Role | Can do |
| --- | --- |
| `player` | Full CRUD on their own games, unit profiles, and proficiency adjustments; read the team roster and factions. |
| `captain` | All player rights, plus read every player's games and proficiencies, manage events, and run the pairing tool. |
| `admin` | Full control: edit or delete any data, assign roles, act as captain. |

New sign-ups land in a `pending` state and must be approved before they can see
anything.

## Local setup

You will need a Supabase project (or the Supabase CLI running locally).

```bash
npm install
cp .env.local.example .env.local   # then fill in the two values
npm run dev
```

Both variables come from your Supabase project's **Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The anon key is a public client key by design — every security guarantee in this
app comes from Row-Level Security policies in the database, never from hiding
the key.

Open <http://localhost:3000>.

### Database

The full schema lives in `supabase/migrations/`, applied in filename order.
Central table is `games`; proficiency is a SQL view over game counts plus manual
adjustments. `AoS-App-Suite-Build-Spec.md` documents the tables and policies.

Applying them to a fresh project with the [Supabase
CLI](https://supabase.com/docs/guides/local-development):

```bash
supabase db push
```

Note that the initial migration bootstraps the first admin by matching a
hardcoded email address — change it to your own before running.

## Scripts

```bash
npm run dev     # local dev server
npm run build   # production build
npm run lint    # lint
```

## Games Workshop intellectual property

This project contains **no Games Workshop assets** — no GW fonts, logos,
artwork, or miniature photography. That is deliberate and non-negotiable.
Faction names appear only as plain text, used descriptively to identify what was
played. All visual design is original.

Age of Sigmar is a trademark of Games Workshop Limited. This is an unofficial
fan project with no affiliation with or endorsement by Games Workshop.

## Licence

MIT — see [LICENSE](LICENSE).


## Disclaimer

This is a v