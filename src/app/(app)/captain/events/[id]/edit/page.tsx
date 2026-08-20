import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EventForm from "@/components/EventForm";
import DeleteEventButton from "@/components/DeleteEventButton";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "captain" && me?.role !== "admin") redirect("/");

  const [
    { data: event },
    { data: lineupRows },
    { data: opponentRows },
    { data: profileRows },
    { data: factionRows },
    { count: pairingCount },
    { count: gameCount },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, start_date, end_date, location, format, notes")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("event_player_factions")
      .select("profile_id, faction_id")
      .eq("event_id", id),
    supabase
      .from("event_opponents")
      .select("id, team_name, faction_ids")
      .eq("event_id", id)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("status", "active")
      .order("display_name"),
    supabase
      .from("factions")
      .select("id, name, grand_alliance")
      .eq("active", true)
      .order("sort_order"),
    // Counts only — they feed the delete confirmation.
    supabase
      .from("pairings")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id),
    supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id),
  ]);

  if (!event) {
    notFound();
  }

  const initialLineup = Object.fromEntries(
    (lineupRows ?? []).map((r) => [r.profile_id as string, r.faction_id as string])
  );

  return (
    <div className="mx-auto w-full max-w-lg">
      <h2 className="text-xl tracking-wide text-gold">Edit Event</h2>
      <section className="mt-4 rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg">
        <EventForm
          eventId={event.id}
          factions={factionRows ?? []}
          players={profileRows ?? []}
          initialBasics={event}
          initialLineup={initialLineup}
          initialOpponents={opponentRows ?? []}
          submitLabel="Save Changes"
        />
      </section>

      <section className="mt-6 rounded-lg border border-loss/40 bg-surface p-6 shadow-lg">
        <h3 className="font-display text-base tracking-wide text-loss">
          Delete Event
        </h3>
        <p className="mt-1 text-sm text-muted">
          Removes this event along with its opponent teams, lineup, preference
          rankings and recorded pairings. Logged games are kept but lose their
          event tag.
        </p>
        <div className="mt-4">
          <DeleteEventButton
            eventId={event.id}
            eventName={event.name}
            pairingCount={pairingCount ?? 0}
            gameCount={gameCount ?? 0}
            variant="button"
          />
        </div>
      </section>
    </div>
  );
}
