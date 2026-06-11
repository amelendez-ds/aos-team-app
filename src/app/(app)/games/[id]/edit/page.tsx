import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateGame } from "@/app/games/actions";
import GameForm from "@/components/GameForm";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS: players can only fetch their own games here, so a foreign id 404s.
  const [{ data: game }, { data: factions }, { data: events }] =
    await Promise.all([
      supabase
        .from("games")
        .select(
          "id, player_faction_id, opponent_faction_id, result, score_self, score_opp, battle_tactics_self, battle_tactics_opp, event_id, played_on, notes"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("factions")
        .select("id, name, grand_alliance")
        .eq("active", true)
        .order("sort_order"),
      supabase.from("events").select("id, name").order("start_date", {
        ascending: false,
      }),
    ]);

  if (!game) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h2 className="text-xl tracking-wide text-gold">Edit Game</h2>
      <section className="mt-4 rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg">
        <GameForm
          factions={factions ?? []}
          events={events ?? []}
          initial={game}
          action={updateGame.bind(null, game.id)}
          submitLabel="Save Changes"
        />
      </section>
    </div>
  );
}
