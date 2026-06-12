import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventForm from "@/components/EventForm";
import FactionDot from "@/components/FactionDot";
import PairingHelper from "@/components/PairingHelper";
import { matchupTier, TIER_CELL_CLASS, type MatchupCell } from "@/lib/matchup";

type StatRow = {
  profile_id: string;
  faction_id: string;
  axis: "playing" | "against";
  games_played: number;
  win_rate: number;
  level: number;
};

export default async function CaptainPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // UI gate; events/pairings RLS re-enforce captain/admin on every write.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "captain" && me?.role !== "admin") redirect("/");

  const [
    { data: profileRows },
    { data: factionRows },
    { data: statRows, error: statsError },
    { data: eventRows },
    { data: eventResultRows },
    { data: pairingRows },
  ] = await Promise.all([
    supabase.from("profiles").select("id, display_name").order("display_name"),
    supabase
      .from("factions")
      .select("id, name, color_hex, grand_alliance")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("team_player_faction_stats")
      .select("profile_id, faction_id, axis, games_played, win_rate, level")
      .eq("axis", "against"),
    supabase
      .from("events")
      .select("id, name, start_date, end_date, location, format")
      .order("start_date", { ascending: false, nullsFirst: false }),
    supabase.from("team_event_results").select("*"),
    supabase.from("pairings").select("id, event_id, round"),
  ]);

  if (statsError) {
    throw new Error(`Could not load team stats: ${statsError.message}`);
  }

  const players = profileRows ?? [];
  const factions = factionRows ?? [];
  const stats = (statRows ?? []) as StatRow[];
  const events = eventRows ?? [];

  const resultByEvent = new Map(
    (eventResultRows ?? []).map((r) => [r.event_id as string, r])
  );
  const pairingCountByEvent = new Map<string, number>();
  for (const p of pairingRows ?? []) {
    pairingCountByEvent.set(
      p.event_id,
      (pairingCountByEvent.get(p.event_id) ?? 0) + 1
    );
  }

  // (player, faction) -> against-axis cell, shared by matrix and helper.
  const cellByKey = new Map<string, MatchupCell>(
    stats.map((s) => [
      `${s.profile_id}:${s.faction_id}`,
      { level: s.level, winRate: s.win_rate, gamesPlayed: s.games_played },
    ])
  );

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl tracking-wide text-gold">Captain&apos;s Panel</h2>

      {/* ------------------------------------------------ Pairing helper */}
      <PairingHelper
        players={players}
        factions={factions}
        cells={Object.fromEntries(cellByKey)}
        events={events.map((e) => ({ id: e.id as string, name: e.name as string }))}
      />

      {/* ------------------------------------------- Proficiency matrix */}
      <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
        <h3 className="text-base tracking-wide text-gold">
          Team Proficiency Matrix
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          Matchup knowledge (against axis): level and win rate of each player
          into each enemy faction.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="border-separate border-spacing-px text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface p-1.5 text-left font-normal text-muted">
                  Player
                </th>
                {factions.map((f) => (
                  <th
                    key={f.id}
                    className="min-w-12 p-1.5 text-center font-normal text-muted"
                    title={f.name}
                  >
                    <FactionDot color={f.color_hex} />
                    <span className="mt-0.5 block">
                      {(f.name as string)
                        .split(/[\s-]/)
                        .map((w) => w[0])
                        .join("")}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <th className="sticky left-0 max-w-28 truncate bg-surface p-1.5 text-left font-normal text-text">
                    {p.display_name}
                  </th>
                  {factions.map((f) => {
                    const cell = cellByKey.get(`${p.id}:${f.id}`);
                    const tier = matchupTier(cell);
                    return (
                      <td
                        key={f.id}
                        className={`p-1.5 text-center ${TIER_CELL_CLASS[tier]}`}
                        title={`${p.display_name} vs ${f.name}`}
                      >
                        {cell ? (
                          <>
                            <span className="block font-semibold">
                              {cell.level}
                            </span>
                            <span className="block opacity-80">
                              {Math.round(cell.winRate * 100)}%
                            </span>
                          </>
                        ) : (
                          "·"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          <span className="text-win">green</span> strong ·{" "}
          <span className="text-gold">amber</span> fair ·{" "}
          <span className="text-loss">red</span> weak · grey untested. Faction
          initials — hover/tap a column for the full name.
        </p>
      </section>

      {/* ----------------------------------------------------- Events */}
      <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base tracking-wide text-gold">Events</h3>
        </div>

        {events.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No events yet — muster the team below.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-bronze/20">
            {events.map((e) => {
              const result = resultByEvent.get(e.id);
              const pairingCount = pairingCountByEvent.get(e.id) ?? 0;
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-3"
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
                      {e.format ? ` · ${e.format}` : ""}
                      {pairingCount > 0
                        ? ` · ${pairingCount} pairing${pairingCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    {result ? (
                      <span className="whitespace-nowrap">
                        <span className="text-win">{result.wins}W</span>{" "}
                        <span className="text-loss">{result.losses}L</span>{" "}
                        <span className="text-muted">{result.draws}D</span>
                      </span>
                    ) : (
                      <span className="text-muted">No games</span>
                    )}
                    <Link
                      href={`/captain/events/${e.id}/edit`}
                      className="text-gold underline-offset-2 transition-colors hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-4 rounded border border-bronze/40 bg-bg p-4">
          <summary className="cursor-pointer font-display tracking-wide text-gold">
            New Event
          </summary>
          <div className="mt-4">
            <EventForm
              eventId={null}
              factions={factions}
              players={players}
              submitLabel="Create Event"
            />
          </div>
        </details>
      </section>
    </div>
  );
}
