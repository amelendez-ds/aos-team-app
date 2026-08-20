"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// App-side guard only; events and pairings RLS re-enforce captain/admin.
async function requireCaptain() {
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
  if (me?.role !== "captain" && me?.role !== "admin") {
    throw new Error("Only captains can do this");
  }
  return { supabase, user };
}

export type EventBasics = {
  name: string;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  format: string | null;
  notes: string | null;
};

export type OpponentInput = {
  id?: string | null; // present = existing row (keeps preferences alive)
  teamName: string;
  factionIds: string[];
};

export type SaveEventPayload = {
  basics: EventBasics;
  // profileId -> factionId; missing/null = not attending
  lineup: Record<string, string | null>;
  opponents: OpponentInput[];
};

function revalidateEventPages() {
  revalidatePath("/captain");
  revalidatePath("/events");
  revalidatePath("/team");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanBasics(basics: EventBasics): EventBasics {
  const name = basics.name.trim();
  if (!name) throw new Error("Event name is required");
  const date = (v: string | null) => {
    const raw = (v ?? "").trim();
    if (raw === "") return null;
    if (!DATE_RE.test(raw)) throw new Error("Invalid date");
    return raw;
  };
  const text = (v: string | null) => {
    const raw = (v ?? "").trim();
    return raw === "" ? null : raw;
  };
  return {
    name,
    start_date: date(basics.start_date),
    end_date: date(basics.end_date),
    location: text(basics.location),
    format: text(basics.format),
    notes: text(basics.notes),
  };
}

export async function saveEvent(
  eventId: string | null,
  payload: SaveEventPayload
) {
  const { supabase, user } = await requireCaptain();
  const basics = cleanBasics(payload.basics);

  const opponents = payload.opponents
    .map((o) => ({
      id: o.id ?? null,
      teamName: o.teamName.trim(),
      factionIds: o.factionIds.filter((f) => f !== ""),
    }))
    .filter((o) => o.teamName !== "" || o.factionIds.length > 0);
  if (opponents.length === 0) {
    throw new Error("Add at least one opponent team");
  }
  for (const o of opponents) {
    if (!o.teamName) throw new Error("Every opponent team needs a name");
    if (o.factionIds.length === 0) {
      throw new Error(`Give ${o.teamName} at least one faction`);
    }
    if (o.factionIds.length > 6) {
      throw new Error("An opponent team has at most 6 factions");
    }
  }

  // faction_ids arrays carry no FK, so validate every id we are about to
  // write (lineup ids too) against the factions table.
  const { data: factionRows } = await supabase.from("factions").select("id");
  const validFactions = new Set((factionRows ?? []).map((f) => f.id as string));
  const lineup = Object.entries(payload.lineup).filter(
    ([, factionId]) => factionId
  ) as [string, string][];
  for (const id of [
    ...opponents.flatMap((o) => o.factionIds),
    ...lineup.map(([, f]) => f),
  ]) {
    if (!validFactions.has(id)) throw new Error("Unknown faction");
  }

  // ---- events row ----
  let id = eventId;
  if (id) {
    const { error } = await supabase.from("events").update(basics).eq("id", id);
    if (error) throw new Error(`Could not update event: ${error.message}`);
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert({ ...basics, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Could not create event: ${error?.message}`);
    }
    id = data.id as string;
  }

  // ---- lineup: upsert assigned players, drop unassigned ----
  if (lineup.length > 0) {
    const { error } = await supabase.from("event_player_factions").upsert(
      lineup.map(([profileId, factionId]) => ({
        event_id: id,
        profile_id: profileId,
        faction_id: factionId,
      })),
      { onConflict: "event_id,profile_id" }
    );
    if (error) throw new Error(`Could not save lineup: ${error.message}`);
  }
  let removeLineup = supabase
    .from("event_player_factions")
    .delete()
    .eq("event_id", id);
  if (lineup.length > 0) {
    removeLineup = removeLineup.not(
      "profile_id",
      "in",
      `(${lineup.map(([p]) => p).join(",")})`
    );
  }
  const { error: lineupDeleteError } = await removeLineup;
  if (lineupDeleteError) {
    throw new Error(`Could not save lineup: ${lineupDeleteError.message}`);
  }

  // ---- opponents: update by id / insert new / delete removed. Never
  // delete-and-reinsert wholesale: event_preferences cascade off these rows.
  const keptIds: string[] = [];
  for (const [index, o] of opponents.entries()) {
    const row = {
      event_id: id,
      team_name: o.teamName,
      faction_ids: o.factionIds,
      sort_order: index * 10,
    };
    if (o.id) {
      const { error } = await supabase
        .from("event_opponents")
        .update(row)
        .eq("id", o.id);
      if (error) throw new Error(`Could not save opponents: ${error.message}`);
      keptIds.push(o.id);
    } else {
      const { data, error } = await supabase
        .from("event_opponents")
        .insert(row)
        .select("id")
        .single();
      if (error || !data) {
        throw new Error(`Could not save opponents: ${error?.message}`);
      }
      keptIds.push(data.id as string);
    }
  }
  const { error: oppDeleteError } = await supabase
    .from("event_opponents")
    .delete()
    .eq("event_id", id)
    .not("id", "in", `(${keptIds.join(",")})`);
  if (oppDeleteError) {
    throw new Error(`Could not save opponents: ${oppDeleteError.message}`);
  }

  revalidateEventPages();
  redirect("/captain");
}

export type PairingInput = {
  ourPlayerId: string;
  oppFactionId: string;
};

export async function savePairings(
  eventId: string,
  opponentId: string,
  pairings: PairingInput[]
) {
  if (!eventId || !opponentId) {
    throw new Error("Pick an event and opponent team before recording");
  }
  if (pairings.length === 0) throw new Error("No pairings to record");

  const { supabase } = await requireCaptain();

  // One battle per opponent team: the round number is the sequence in which
  // teams get recorded. Re-recording a team replaces its pairings and keeps
  // its round slot.
  const { data: existing, error: existingError } = await supabase
    .from("pairings")
    .select("round, opponent_id")
    .eq("event_id", eventId);
  if (existingError) {
    throw new Error(`Could not record pairings: ${existingError.message}`);
  }
  const ownRounds = (existing ?? [])
    .filter((r) => r.opponent_id === opponentId)
    .map((r) => r.round as number);
  const round =
    ownRounds.length > 0
      ? Math.min(...ownRounds)
      : Math.max(0, ...(existing ?? []).map((r) => r.round as number)) + 1;

  const { error: deleteError } = await supabase
    .from("pairings")
    .delete()
    .eq("event_id", eventId)
    .eq("opponent_id", opponentId);
  if (deleteError) {
    throw new Error(`Could not clear old pairings: ${deleteError.message}`);
  }

  const { error } = await supabase.from("pairings").insert(
    pairings.map((p) => ({
      event_id: eventId,
      opponent_id: opponentId,
      round,
      our_player_id: p.ourPlayerId,
      opp_faction_id: p.oppFactionId,
    }))
  );
  if (error) throw new Error(`Could not record pairings: ${error.message}`);

  revalidateEventPages();
}

export async function deleteEvent(eventId: string) {
  const { supabase } = await requireCaptain();

  // Opponents, lineup, preferences and pairings cascade away with the event.
  // Logged games survive: games.event_id is ON DELETE SET NULL.
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(`Could not delete event: ${error.message}`);

  revalidateEventPages();
  revalidatePath("/games"); // the event column and the logging dropdown
  revalidatePath("/");
  redirect("/captain");
}
