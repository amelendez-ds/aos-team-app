"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions";

// Replace the caller's preference ranking for one opponent team.
// orderedFactionIds[0] = most preferred matchup (rank 1).
export async function savePreferences(
  eventId: string,
  opponentId: string,
  orderedFactionIds: string[]
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (
    orderedFactionIds.length === 0 ||
    orderedFactionIds.length > 6 ||
    new Set(orderedFactionIds).size !== orderedFactionIds.length
  ) {
    return { error: "Invalid ranking." };
  }

  // The ranking must cover exactly this opponent's factions.
  const { data: opponent } = await supabase
    .from("event_opponents")
    .select("event_id, faction_ids")
    .eq("id", opponentId)
    .maybeSingle();
  if (!opponent || opponent.event_id !== eventId) {
    return { error: "Unknown opponent team." };
  }
  const theirs = new Set(opponent.faction_ids as string[]);
  if (
    orderedFactionIds.length !== theirs.size ||
    orderedFactionIds.some((id) => !theirs.has(id))
  ) {
    return { error: "Ranking does not match the opponent's factions." };
  }

  // Own rows only (explicit filter on top of the own-row RLS policy).
  const { error: deleteError } = await supabase
    .from("event_preferences")
    .delete()
    .eq("event_id", eventId)
    .eq("opponent_id", opponentId)
    .eq("profile_id", user.id);
  if (deleteError) {
    return { error: `Could not save ranking: ${deleteError.message}` };
  }

  const { error } = await supabase.from("event_preferences").insert(
    orderedFactionIds.map((factionId, i) => ({
      event_id: eventId,
      profile_id: user.id,
      opponent_id: opponentId,
      faction_id: factionId,
      preference_rank: i + 1,
    }))
  );
  if (error) return { error: `Could not save ranking: ${error.message}` };

  revalidatePath("/events");
  return {};
}
