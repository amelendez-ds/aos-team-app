"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLES = ["player", "captain", "admin"] as const;
export type Role = (typeof ROLES)[number];

// App-side guard only; the database enforces this again via the
// profiles_update_admin policy and the guard trigger / reject function.
async function requireAdmin() {
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
  if (me?.role !== "admin") {
    throw new Error("Admins only");
  }
  return { supabase, user };
}

export async function updateRole(profileId: string, role: string) {
  if (!ROLES.includes(role as Role)) {
    throw new Error("Invalid role");
  }

  const { supabase, user } = await requireAdmin();
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

export async function approveUser(profileId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "active" })
    .eq("id", profileId)
    .eq("status", "pending");
  if (error) throw new Error(`Could not approve: ${error.message}`);

  revalidatePath("/admin");
}

export async function deleteUser(profileId: string) {
  const { supabase, user } = await requireAdmin();
  if (profileId === user.id) {
    throw new Error("Admins cannot delete their own account");
  }

  // SECURITY DEFINER function: re-checks admin, blocks self-deletion,
  // cleans non-cascading references, and removes the auth user.
  const { error } = await supabase.rpc("admin_delete_user", {
    uid: profileId,
  });
  if (error) throw new Error(`Could not delete member: ${error.message}`);

  // Their games and stats vanish from every page.
  revalidatePath("/", "layout");
}

export async function rejectUser(profileId: string) {
  const { supabase } = await requireAdmin();

  // SECURITY DEFINER function: re-checks admin, only deletes pending
  // accounts, and removes the auth user (cascade cleans the profile).
  const { error } = await supabase.rpc("reject_pending_user", {
    uid: profileId,
  });
  if (error) throw new Error(`Could not reject: ${error.message}`);

  revalidatePath("/admin");
}
