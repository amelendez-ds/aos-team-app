import { createClient } from "@/lib/supabase/server";
import { createGame } from "@/app/games/actions";
import GameForm from "@/components/GameForm";

export default async function NewGamePage() {
  const supabase = await createClient();

  const [{ data: factions }, { data: events }, { data: userData }] =
    await Promise.all([
      supabase
        .from("factions")
        .select("id, name, grand_alliance")
        .eq("active", true)
        .order("sort_order"),
      supabase.from("events").select("id, name").order("start_date", {
        ascending: false,
      }),
      supabase.auth.getUser(),
    ]);

  let primaryFactionId: string | undefined;
  if (userData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_faction_id")
      .eq("id", userData.user.id)
      .single();
    primaryFactionId = profile?.primary_faction_id ?? undefined;
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h2 className="text-xl tracking-wide text-gold">Log a Game</h2>
      <section className="mt-4 rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg">
        <GameForm
          factions={factions ?? []}
          events={events ?? []}
          initial={
            primaryFactionId
              ? { player_faction_id: primaryFactionId }
              : undefined
          }
          action={createGame}
          submitLabel="Record the Battle"
        />
      </section>
    </div>
  );
}
