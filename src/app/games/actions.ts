"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions";

const RESULTS = ["win", "loss", "draw"] as const;

type GameFields = {
  player_faction_id: string;
  opponent_faction_id: string;
  result: (typeof RESULTS)[number];
  score_self: number | null;
  score_opp: number | null;
  battle_tactics_self: number | null;
  battle_tactics_opp: number | null;
  event_id: string | null;
  played_on: string;
  notes: string | null;
};

// Returns the parsed row or the message to show under the form — never throws,
// so a mistyped field reaches the user instead of the error boundary.
function parseGameForm(
  formData: FormData
): { ok: true; fields: GameFields } | { ok: false; error: string } {
  const result = String(formData.get("result") ?? "");
  if (!RESULTS.includes(result as (typeof RESULTS)[number])) {
    return { ok: false, error: "Pick a result: win, loss or draw." };
  }

  const playerFactionId = String(formData.get("player_faction_id") ?? "");
  const opponentFactionId = String(formData.get("opponent_faction_id") ?? "");
  if (!playerFactionId || !opponentFactionId) {
    return { ok: false, error: "Both factions are required." };
  }

  const playedOn = String(formData.get("played_on") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playedOn)) {
    return { ok: false, error: "Pick the date the game was played." };
  }

  const scores: Record<string, number | null> = {};
  for (const field of [
    "score_self",
    "score_opp",
    "battle_tactics_self",
    "battle_tactics_opp",
  ]) {
    const raw = String(formData.get(field) ?? "").trim();
    if (raw === "") {
      scores[field] = null;
      continue;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      return { ok: false, error: "Scores must be whole numbers, 0 or more." };
    }
    scores[field] = n;
  }

  const eventId = String(formData.get("event_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  return {
    ok: true,
    fields: {
      player_faction_id: playerFactionId,
      opponent_faction_id: opponentFactionId,
      result: result as (typeof RESULTS)[number],
      score_self: scores.score_self,
      score_opp: scores.score_opp,
      battle_tactics_self: scores.battle_tactics_self,
      battle_tactics_opp: scores.battle_tactics_opp,
      event_id: eventId === "" ? null : eventId,
      played_on: playedOn,
      notes: notes === "" ? null : notes,
    },
  };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createGame(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const parsed = parseGameForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase
    .from("games")
    .insert({ ...parsed.fields, owner_id: user.id });
  if (error) return { error: `Could not save game: ${error.message}` };

  revalidatePath("/games");
  revalidatePath("/");
  redirect("/games?saved=1");
}

export async function updateGame(
  id: string,
  returnTo: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase } = await requireUser();
  const parsed = parseGameForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  // RLS limits the update to the caller's own rows (or admin).
  const { error } = await supabase
    .from("games")
    .update(parsed.fields)
    .eq("id", id);
  if (error) return { error: `Could not update game: ${error.message}` };

  revalidatePath("/games");
  revalidatePath("/admin");
  redirect(returnTo === "/admin" ? "/admin?saved=1" : "/games?saved=1");
}

export async function deleteGame(id: string): Promise<FormState> {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) return { error: `Could not delete game: ${error.message}` };

  revalidatePath("/games");
  revalidatePath("/admin");
  revalidatePath("/");
  return {};
}
