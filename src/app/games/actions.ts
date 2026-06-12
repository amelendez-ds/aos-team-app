"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const RESULTS = ["win", "loss", "draw"] as const;

function parseGameForm(formData: FormData) {
  const result = String(formData.get("result") ?? "");
  if (!RESULTS.includes(result as (typeof RESULTS)[number])) {
    throw new Error("Invalid result");
  }

  const playerFactionId = String(formData.get("player_faction_id") ?? "");
  const opponentFactionId = String(formData.get("opponent_faction_id") ?? "");
  if (!playerFactionId || !opponentFactionId) {
    throw new Error("Both factions are required");
  }

  const playedOn = String(formData.get("played_on") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playedOn)) {
    throw new Error("Invalid date");
  }

  const parseScore = (field: string) => {
    const raw = String(formData.get(field) ?? "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) throw new Error("Invalid score");
    return n;
  };

  const eventId = String(formData.get("event_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  return {
    player_faction_id: playerFactionId,
    opponent_faction_id: opponentFactionId,
    result,
    score_self: parseScore("score_self"),
    score_opp: parseScore("score_opp"),
    battle_tactics_self: parseScore("battle_tactics_self"),
    battle_tactics_opp: parseScore("battle_tactics_opp"),
    event_id: eventId === "" ? null : eventId,
    played_on: playedOn,
    notes: notes === "" ? null : notes,
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

export async function createGame(formData: FormData) {
  const { supabase, user } = await requireUser();
  const fields = parseGameForm(formData);

  const { error } = await supabase
    .from("games")
    .insert({ ...fields, owner_id: user.id });
  if (error) throw new Error(`Could not save game: ${error.message}`);

  revalidatePath("/games");
  revalidatePath("/");
  redirect("/games");
}

export async function updateGame(
  id: string,
  returnTo: string,
  formData: FormData
) {
  const { supabase } = await requireUser();
  const fields = parseGameForm(formData);

  // RLS limits the update to the caller's own rows (or admin).
  const { error } = await supabase.from("games").update(fields).eq("id", id);
  if (error) throw new Error(`Could not update game: ${error.message}`);

  revalidatePath("/games");
  revalidatePath("/admin");
  redirect(returnTo === "/admin" ? "/admin" : "/games");
}

export async function deleteGame(id: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) throw new Error(`Could not delete game: ${error.message}`);

  revalidatePath("/games");
  revalidatePath("/admin");
  revalidatePath("/");
}
