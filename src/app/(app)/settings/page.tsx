import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import SavedBanner from "@/components/SavedBanner";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: factions }, { saved }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, primary_faction_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("factions")
      .select("id, name, grand_alliance")
      .eq("active", true)
      .order("sort_order"),
    searchParams,
  ]);

  return (
    <div className="mx-auto w-full max-w-md">
      <h2 className="text-xl tracking-wide text-gold">Profile Settings</h2>

      <section className="mt-4 rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg">
        {saved && <SavedBanner message="Profile saved." className="mb-4" />}

        <ProfileForm
          factions={factions ?? []}
          displayName={profile?.display_name ?? ""}
          primaryFactionId={profile?.primary_faction_id ?? ""}
        />
      </section>
    </div>
  );
}
