import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FactionDot from "@/components/FactionDot";
import PreferenceRanker from "@/components/PreferenceRanker";

type EventRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  format: string | null;
  notes: string | null;
};

type OpponentRow = {
  id: string;
  event_id: string;
  team_name: string;
  faction_ids: string[];
};

type FactionInfo = { name: string; color_hex: string };

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: eventRows, error },
    { data: opponentRows },
    { data: lineupRows },
    { data: prefRows },
    { data: profileRows },
    { data: factionRows },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, start_date, end_date, location, format, notes"),
    supabase
      .from("event_opponents")
      .select("id, event_id, team_name, faction_ids")
      .order("sort_order"),
    supabase
      .from("event_player_factions")
      .select("event_id, profile_id, faction_id"),
    // Own rankings only — this page never shows other players' preferences.
    supabase
      .from("event_preferences")
      .select("opponent_id, faction_id, preference_rank")
      .eq("profile_id", user.id)
      .order("preference_rank"),
    supabase.from("profiles").select("id, display_name").order("display_name"),
    supabase.from("factions").select("id, name, color_hex"),
  ]);

  if (error) {
    throw new Error(`Could not load events: ${error.message}`);
  }

  const factions = new Map<string, FactionInfo>(
    (factionRows ?? []).map((f) => [
      f.id as string,
      { name: f.name as string, color_hex: f.color_hex as string },
    ])
  );
  const playerName = new Map(
    (profileRows ?? []).map((p) => [p.id as string, p.display_name as string])
  );

  const opponentsByEvent = new Map<string, OpponentRow[]>();
  for (const o of (opponentRows ?? []) as OpponentRow[]) {
    const list = opponentsByEvent.get(o.event_id) ?? [];
    list.push(o);
    opponentsByEvent.set(o.event_id, list);
  }

  const lineupByEvent = new Map<
    string,
    { profile_id: string; faction_id: string }[]
  >();
  for (const r of lineupRows ?? []) {
    const list = lineupByEvent.get(r.event_id) ?? [];
    list.push(r);
    lineupByEvent.set(r.event_id, list);
  }

  // opponent_id -> faction ids in rank order (rows are pre-sorted by rank).
  const myRanking = new Map<string, string[]>();
  for (const r of prefRows ?? []) {
    const list = myRanking.get(r.opponent_id) ?? [];
    list.push(r.faction_id);
    myRanking.set(r.opponent_id, list);
  }

  const today = new Date().toISOString().slice(0, 10);
  const all = (eventRows ?? []) as EventRow[];
  const upcoming = all
    .filter((e) => !e.start_date || e.start_date >= today)
    .sort((a, b) =>
      !a.start_date ? 1 : !b.start_date ? -1 : a.start_date < b.start_date ? -1 : 1
    );
  const past = all
    .filter((e) => e.start_date && e.start_date < today)
    .sort((a, b) => (a.start_date! > b.start_date! ? -1 : 1));

  function EventCard({ event, open }: { event: EventRow; open: boolean }) {
    const opponents = opponentsByEvent.get(event.id) ?? [];
    const lineup = (lineupByEvent.get(event.id) ?? [])
      .map((r) => ({
        player: playerName.get(r.profile_id) ?? "?",
        faction: factions.get(r.faction_id),
      }))
      .sort((a, b) => a.player.localeCompare(b.player));

    return (
      <details
        open={open}
        className="rounded-lg border border-bronze/40 bg-surface shadow-lg"
      >
        <summary className="cursor-pointer p-4">
          <span className="font-display tracking-wide text-gold">
            {event.name}
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            {event.start_date ? formatDate(event.start_date) : "Date TBC"}
            {event.end_date && event.end_date !== event.start_date
              ? ` – ${formatDate(event.end_date)}`
              : ""}
            {event.location ? ` · ${event.location}` : ""}
            {event.format ? ` · ${event.format}` : ""}
          </span>
        </summary>

        <div className="flex flex-col gap-4 border-t border-bronze/20 p-4">
          {event.notes && <p className="text-sm text-muted">{event.notes}</p>}

          <div>
            <h4 className="text-xs tracking-widest text-muted uppercase">
              Our Lineup
            </h4>
            {lineup.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Not set yet.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                {lineup.map((r) => (
                  <li key={r.player} className="text-text">
                    {r.player}
                    {r.faction && (
                      <span className="text-muted">
                        {" — "}
                        <FactionDot color={r.faction.color_hex} />{" "}
                        <span className="text-text">{r.faction.name}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs tracking-widest text-muted uppercase">
              Opponent Teams
            </h4>
            {opponents.length === 0 ? (
              <p className="mt-1 text-sm text-muted">No opponents listed.</p>
            ) : (
              <div className="mt-1 flex flex-col gap-3">
                {opponents.map((o) => {
                  const ranking = myRanking.get(o.id);
                  // Saved rank order when present, sign-up order otherwise.
                  const orderedIds =
                    ranking && ranking.length === o.faction_ids.length
                      ? ranking
                      : o.faction_ids;
                  const ranked = orderedIds
                    .filter((id) => factions.has(id))
                    .map((id) => ({ id, ...factions.get(id)! }));
                  return (
                    <div
                      key={o.id}
                      className="rounded border border-bronze/30 bg-bg p-3"
                    >
                      <p className="text-sm text-text">{o.team_name}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                        {o.faction_ids.map((id, i) => {
                          const f = factions.get(id);
                          return f ? (
                            <span key={`${id}-${i}`}>
                              <FactionDot color={f.color_hex} /> {f.name}
                            </span>
                          ) : null;
                        })}
                      </p>
                      <div className="mt-2 border-t border-bronze/20 pt-2">
                        <h5 className="text-xs tracking-widest text-muted uppercase">
                          Your matchup ranking
                        </h5>
                        <PreferenceRanker
                          eventId={event.id}
                          opponentId={o.id}
                          factions={ranked}
                          saved={Boolean(ranking)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </details>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl tracking-wide text-gold">Events</h2>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm tracking-widest text-muted uppercase">
          Upcoming
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing on the horizon — the captain can muster one from the
            Captain&apos;s Panel.
          </p>
        ) : (
          upcoming.map((e, i) => (
            <EventCard key={e.id} event={e} open={i === 0} />
          ))
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm tracking-widest text-muted uppercase">
            Past
          </h3>
          {past.map((e) => (
            <EventCard key={e.id} event={e} open={false} />
          ))}
        </section>
      )}
    </div>
  );
}
