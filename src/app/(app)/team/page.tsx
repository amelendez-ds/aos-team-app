import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FactionDot from "@/components/FactionDot";
import {
  calculateOverallLevel,
  getDominantAlliance,
  getRank,
  pickMainArmy,
  type GrandAlliance,
  type PlayerFactionStat,
} from "@/lib/ranks";

type TeamStatRow = PlayerFactionStat & {
  profile_id: string;
  wins: number;
  losses: number;
  draws: number;
};

type FactionInfo = {
  name: string;
  color_hex: string;
  grand_alliance: GrandAlliance;
};

type EventResult = {
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
};

function winRateColor(rate: number): string {
  if (rate >= 0.55) return "text-win";
  if (rate <= 0.45) return "text-loss";
  return "text-gold";
}

function Record({ wins, losses, draws }: EventResult | Omit<EventResult, "games_played">) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-win">{wins}W</span>{" "}
      <span className="text-loss">{losses}L</span>{" "}
      <span className="text-muted">{draws}D</span>
    </span>
  );
}

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: statRows, error },
    { data: factionRows },
    { data: profileRows },
    { data: eventRows },
    { data: eventResultRows },
  ] = await Promise.all([
    supabase.from("team_player_faction_stats").select("*"),
    supabase.from("factions").select("id, name, color_hex, grand_alliance"),
    supabase.from("profiles").select("id, display_name").order("display_name"),
    supabase
      .from("events")
      .select("id, name, start_date, location")
      .order("start_date", { ascending: false, nullsFirst: false }),
    supabase.from("team_event_results").select("*"),
  ]);

  if (error) {
    throw new Error(`Could not load team stats: ${error.message}`);
  }

  const stats = (statRows ?? []) as TeamStatRow[];
  const factions = new Map<string, FactionInfo>(
    (factionRows ?? []).map((f) => [
      f.id,
      {
        name: f.name as string,
        color_hex: f.color_hex as string,
        grand_alliance: f.grand_alliance as GrandAlliance,
      },
    ])
  );
  const allianceOf = new Map<string, GrandAlliance>(
    [...factions].map(([id, f]) => [id, f.grand_alliance])
  );

  // Each game appears exactly once on the playing axis, so summing those
  // rows gives the team's true overall record.
  const playing = stats.filter((s) => s.axis === "playing");
  const team = playing.reduce(
    (acc, s) => ({
      games: acc.games + s.games_played,
      wins: acc.wins + s.wins,
      losses: acc.losses + s.losses,
      draws: acc.draws + s.draws,
    }),
    { games: 0, wins: 0, losses: 0, draws: 0 }
  );

  // Against-axis rows summed per opponent faction = how the team fares
  // into each enemy faction.
  const vsFaction = new Map<
    string,
    { games: number; wins: number; losses: number; draws: number }
  >();
  for (const s of stats) {
    if (s.axis !== "against") continue;
    const cur = vsFaction.get(s.faction_id) ?? {
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    };
    cur.games += s.games_played;
    cur.wins += s.wins;
    cur.losses += s.losses;
    cur.draws += s.draws;
    vsFaction.set(s.faction_id, cur);
  }
  const vsRows = [...vsFaction.entries()]
    .map(([factionId, r]) => ({ factionId, ...r, rate: r.wins / r.games }))
    .sort((a, b) => b.rate - a.rate || b.games - a.games);

  const statsByPlayer = new Map<string, TeamStatRow[]>();
  for (const s of stats) {
    const list = statsByPlayer.get(s.profile_id) ?? [];
    list.push(s);
    statsByPlayer.set(s.profile_id, list);
  }

  const events = (eventRows ?? []).slice(0, 5);
  const resultByEvent = new Map<string, EventResult>(
    (eventResultRows ?? []).map((r) => [r.event_id as string, r as EventResult])
  );

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl tracking-wide text-gold">Team Overview</h2>

      <section className="rounded-lg border border-bronze/40 bg-surface p-6 text-center shadow-lg">
        <h3 className="text-sm tracking-widest text-muted uppercase">
          Team Record
        </h3>
        {team.games === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No games chronicled yet — the saga awaits.
          </p>
        ) : (
          <>
            <p
              className={`mt-2 font-display text-3xl ${winRateColor(team.wins / team.games)}`}
            >
              {Math.round((team.wins / team.games) * 100)}%
            </p>
            <p className="mt-1 text-sm text-text">
              <Record wins={team.wins} losses={team.losses} draws={team.draws} />{" "}
              <span className="text-muted">
                · {team.games} game{team.games === 1 ? "" : "s"}
              </span>
            </p>
          </>
        )}
      </section>

      <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
        <h3 className="text-base tracking-wide text-gold">Versus the Foe</h3>
        <p className="mt-0.5 text-xs text-muted">
          Team record into each enemy faction — dominance at the top,
          trouble at the bottom.
        </p>
        {vsRows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No matchups recorded yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-bronze/20">
            {vsRows.map((r) => {
              const faction = factions.get(r.factionId);
              return (
                <li
                  key={r.factionId}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <p className="min-w-0 truncate text-text">
                    {faction && <FactionDot color={faction.color_hex} />}{" "}
                    {faction?.name ?? "Unknown faction"}
                  </p>
                  <p className="shrink-0 text-sm">
                    <Record wins={r.wins} losses={r.losses} draws={r.draws} />{" "}
                    <span className={`ml-1 ${winRateColor(r.rate)}`}>
                      {Math.round(r.rate * 100)}%
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base tracking-wide text-gold">The Roster</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(profileRows ?? []).map((p) => {
            const rows = statsByPlayer.get(p.id) ?? [];
            const overallLevel = calculateOverallLevel(rows);
            const overallRank = getRank(
              overallLevel,
              getDominantAlliance(rows, allianceOf)
            );
            const mainArmy = pickMainArmy(rows);
            const mainArmyFaction = mainArmy
              ? factions.get(mainArmy.faction_id)
              : undefined;
            const strongest = rows
              .filter((s) => s.axis === "playing")
              .reduce<TeamStatRow | null>(
                (best, s) =>
                  !best ||
                  s.level > best.level ||
                  (s.level === best.level && s.games_played > best.games_played)
                    ? s
                    : best,
                null
              );
            const strongestFaction = strongest
              ? factions.get(strongest.faction_id)
              : undefined;

            return (
              <article
                key={p.id}
                className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg"
              >
                <h4 className="truncate text-base text-text">
                  {p.display_name}
                </h4>
                <p
                  className="mt-1 font-display text-lg leading-tight"
                  style={{
                    color: overallRank.color,
                    textShadow: overallRank.glow
                      ? `0 0 8px ${overallRank.color}`
                      : undefined,
                  }}
                >
                  {overallRank.title}
                </p>
                <p className="text-xs text-muted">
                  {overallRank.tierName} · Lv {overallLevel}
                </p>
                <dl className="mt-3 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Main army</dt>
                    <dd className="truncate text-text">
                      {mainArmyFaction ? (
                        <>
                          <FactionDot color={mainArmyFaction.color_hex} />{" "}
                          {mainArmyFaction.name}
                        </>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Strongest</dt>
                    <dd className="truncate text-text">
                      {strongest && strongestFaction ? (
                        <>
                          <FactionDot color={strongestFaction.color_hex} />{" "}
                          {strongestFaction.name}{" "}
                          <span className="text-muted">
                            Lv {strongest.level}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      {events.length > 0 && (
        <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
          <h3 className="text-base tracking-wide text-gold">Recent Events</h3>
          <ul className="mt-4 flex flex-col divide-y divide-bronze/20">
            {events.map((e) => {
              const result = resultByEvent.get(e.id);
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-text">{e.name}</p>
                    <p className="text-xs text-muted">
                      {e.start_date
                        ? new Date(
                            `${e.start_date}T00:00:00`
                          ).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Date TBC"}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">
                    {result ? (
                      <Record
                        wins={result.wins}
                        losses={result.losses}
                        draws={result.draws}
                      />
                    ) : (
                      <span className="text-muted">No games yet</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
