import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventForm from "@/components/EventForm";
import WarRoom, {
  type LineupPlayer,
  type OpponentTeam,
} from "@/components/WarRoom";
import type { MatchupCell } from "@/lib/matchup";

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CaptainPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
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
    { data: eventRows },
    { data: profileRows },
    { data: factionRows },
    { data: eventResultRows },
    { data: pairingRows },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, start_date, end_date, location, format")
      .order("start_date", { ascending: false, nullsFirst: false }),
    supabase.from("profiles").select("id, display_name").order("display_name"),
    supabase
      .from("factions")
      .select("id, name, color_hex, grand_alliance")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("team_event_results").select("*"),
    supabase.from("pairings").select("id, event_id"),
  ]);

  const events = eventRows ?? [];
  const players = profileRows ?? [];
  const factions = factionRows ?? [];

  // Upcoming soonest-first, then past newest-first; default = next upcoming.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter((e) => !e.start_date || e.start_date >= today)
    .sort((a, b) =>
      !a.start_date ? 1 : !b.start_date ? -1 : a.start_date < b.start_date ? -1 : 1
    );
  const past = events
    .filter((e) => e.start_date && e.start_date < today)
    .sort((a, b) => (a.start_date! > b.start_date! ? -1 : 1));
  const ordered = [...upcoming, ...past];

  const { event: eventParam } = await searchParams;
  const selected =
    ordered.find((e) => e.id === eventParam) ?? ordered[0] ?? null;

  // Per-event war-room data.
  let lineup: LineupPlayer[] = [];
  let opponents: OpponentTeam[] = [];
  let cells: Record<string, MatchupCell> = {};
  let prefs: Record<string, number> = {};

  if (selected) {
    const [{ data: lineupRows }, { data: opponentRows }, { data: prefRows }] =
      await Promise.all([
        supabase
          .from("event_player_factions")
          .select("profile_id, faction_id")
          .eq("event_id", selected.id),
        supabase
          .from("event_opponents")
          .select("id, team_name, faction_ids")
          .eq("event_id", selected.id)
          .order("sort_order"),
        // All players' rankings — captain-readable by RLS.
        supabase
          .from("event_preferences")
          .select("profile_id, opponent_id, faction_id, preference_rank")
          .eq("event_id", selected.id),
      ]);

    const nameOf = new Map(players.map((p) => [p.id, p.display_name]));
    const factionOf = new Map(
      factions.map((f) => [f.id, { name: f.name, color_hex: f.color_hex }])
    );

    lineup = (lineupRows ?? [])
      .map((r) => ({
        playerId: r.profile_id as string,
        displayName: (nameOf.get(r.profile_id) ?? "?") as string,
        ownFaction: factionOf.get(r.faction_id) ?? null,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    opponents = (opponentRows ?? []).map((o) => ({
      id: o.id as string,
      teamName: o.team_name as string,
      factionIds: (o.faction_ids ?? []) as string[],
    }));

    if (lineup.length > 0) {
      const lineupIds = lineup.map((p) => p.playerId);
      const { data: statRows } = await supabase
        .from("team_player_faction_stats")
        .select("profile_id, faction_id, games_played, win_rate, level")
        .eq("axis", "against")
        .in("profile_id", lineupIds);
      cells = Object.fromEntries(
        (statRows ?? []).map((s) => [
          `${s.profile_id}:${s.faction_id}`,
          {
            level: s.level as number,
            winRate: s.win_rate as number,
            gamesPlayed: s.games_played as number,
          },
        ])
      );
    }

    prefs = Object.fromEntries(
      (prefRows ?? []).map((r) => [
        `${r.profile_id}:${r.opponent_id}:${r.faction_id}`,
        r.preference_rank as number,
      ])
    );
  }

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

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl tracking-wide text-gold">Captain&apos;s Panel</h2>

      {/* ------------------------------------------------ Event selector */}
      <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
        <h3 className="text-base tracking-wide text-gold">Event</h3>
        {ordered.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No events yet — create one in the Events section below, then
            return here to plan the rounds.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ordered.map((e) => {
              const on = selected?.id === e.id;
              return (
                <Link
                  key={e.id}
                  href={`/captain?event=${e.id}`}
                  aria-current={on ? "true" : undefined}
                  className={`rounded border px-3 py-2 text-sm transition-colors ${
                    on
                      ? "border-gold/70 bg-gold/15 text-gold"
                      : "border-bronze/40 text-muted hover:border-gold/50"
                  }`}
                >
                  <span className="block font-display tracking-wide">
                    {e.name}
                  </span>
                  <span className="mt-0.5 block text-xs">
                    {e.start_date ? formatDate(e.start_date) : "Date TBC"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- War room */}
      {selected && (
        <WarRoom
          key={selected.id}
          eventId={selected.id}
          lineup={lineup}
          opponents={opponents}
          factions={Object.fromEntries(
            factions.map((f) => [
              f.id,
              { name: f.name as string, color_hex: f.color_hex as string },
            ])
          )}
          cells={cells}
          prefs={prefs}
        />
      )}

      {/* ----------------------------------------------------- Events */}
      <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
        <h3 className="text-base tracking-wide text-gold">Events</h3>

        {events.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No events yet — muster the team below.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-bronze/20">
            {ordered.map((e) => {
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
                      {e.start_date ? formatDate(e.start_date) : "Date TBC"}
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
