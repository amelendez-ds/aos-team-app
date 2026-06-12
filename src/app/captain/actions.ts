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

function parseEventForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Event name is required");

  const parseDate = (field: string) => {
    const raw = String(formData.get(field) ?? "").trim();
    if (raw === "") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error("Invalid date");
    return raw;
  };
  const parseText = (field: string) => {
    const raw = String(formData.get(field) ?? "").trim();
    return raw === "" ? null : raw;
  };

  return {
    name,
    start_date: parseDate("start_date"),
    end_date: parseDate("end_date"),
    location: parseText("location"),
    format: parseText("format"),
    notes: parseText("notes"),
  };
}

function revalidateCaptainPages() {
  revalidatePath("/captain");
  revalidatePath("/team");
}

export async function createEvent(formData: FormData) {
  const { supabase, user } = await requireCaptain();
  const fields = parseEventForm(formData);

  const { error } = await supabase
    .from("events")
    .insert({ ...fields, created_by: user.id });
  if (error) throw new Error(`Could not create event: ${error.message}`);

  revalidateCaptainPages();
  redirect("/captain");
}

export async function updateEvent(id: string, formData: FormData) {
  const { supabase } = await requireCaptain();
  const fields = parseEventForm(formData);

  const { error } = await supabase.from("events").update(fields).eq("id", id);
  if (error) throw new Error(`Could not update event: ${error.message}`);

  revalidateCaptainPages();
  redirect("/captain");
}

export type PairingInput = {
  ourPlayerId: string;
  oppFactionId: string;
};

export async function savePairings(
  eventId: string,
  round: number,
  pairings: PairingInput[]
) {
  if (!eventId) throw new Error("Pick an event before recording");
  if (!Number.isInteger(round) || round < 1) throw new Error("Invalid round");
  if (pairings.length === 0) throw new Error("No pairings to record");

  const { supabase } = await requireCaptain();

  // Re-recording a round replaces it.
  const { error: deleteError } = await supabase
    .from("pairings")
    .delete()
    .eq("event_id", eventId)
    .eq("round", round);
  if (deleteError) {
    throw new Error(`Could not clear old pairings: ${deleteError.message}`);
  }

  const { error } = await supabase.from("pairings").insert(
    pairings.map((p) => ({
      event_id: eventId,
      round,
      our_player_id: p.ourPlayerId,
      opp_faction_id: p.oppFactionId,
    }))
  );
  if (error) throw new Error(`Could not record pairings: ${error.message}`);

  revalidateCaptainPages();
}
