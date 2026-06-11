"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const AXES = ["playing", "against"] as const;
type Axis = (typeof AXES)[number];

export async function adjustProficiency(
  factionId: string,
  axis: Axis,
  delta: 1 | -1
) {
  if (!AXES.includes(axis) || (delta !== 1 && delta !== -1)) {
    throw new Error("Invalid adjustment");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("proficiency_adjustments")
    .select("manual_delta")
    .eq("profile_id", user.id)
    .eq("faction_id", factionId)
    .eq("axis", axis)
    .maybeSingle();

  const { error } = await supabase.from("proficiency_adjustments").upsert(
    {
      profile_id: user.id,
      faction_id: factionId,
      axis,
      manual_delta: (existing?.manual_delta ?? 0) + delta,
    },
    { onConflict: "profile_id,faction_id,axis" }
  );
  if (error) throw new Error(`Could not save adjustment: ${error.message}`);

  revalidatePath("/proficiency");
}
