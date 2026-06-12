"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) throw new Error("Display name is required");
  if (displayName.length > 40) throw new Error("Display name is too long");

  const primaryFactionId =
    String(formData.get("primary_faction_id") ?? "") || null;

  // Own row only; RLS profiles_update_own backs this, the role-change
  // trigger blocks anything but admins touching role.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, primary_faction_id: primaryFactionId })
    .eq("id", user.id);
  if (error) throw new Error(`Could not save profile: ${error.message}`);

  // Display name appears across the app.
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
