"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions";

export async function updateProfile(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { error: "Display name is required." };
  if (displayName.length > 40) {
    return { error: "Display name is too long (40 characters max)." };
  }

  const primaryFactionId =
    String(formData.get("primary_faction_id") ?? "") || null;

  // Own row only; RLS profiles_update_own backs this, the role-change
  // trigger blocks anything but admins touching role.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, primary_faction_id: primaryFactionId })
    .eq("id", user.id);
  if (error) return { error: `Could not save profile: ${error.message}` };

  // Display name appears across the app.
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
