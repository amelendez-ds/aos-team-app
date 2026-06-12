"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLES = ["player", "captain", "admin"] as const;
export type Role = (typeof ROLES)[number];

export async function updateRole(profileId: string, role: string) {
  if (!ROLES.includes(role as Role)) {
    throw new Error("Invalid role");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // App-side guard only; the database enforces this again via the
  // profiles_update_admin policy and the guard_role_change trigger.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    throw new Error("Only admins can change roles");
  }
  if (profileId === user.id) {
    throw new Error("Admins cannot change their own role");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", profileId);
  if (error) throw new Error(`Could not change role: ${error.message}`);

  revalidatePath("/admin");
}
