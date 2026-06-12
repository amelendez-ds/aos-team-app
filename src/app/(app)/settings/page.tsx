import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/app/settings/actions";

const ALLIANCES = ["Order", "Chaos", "Death", "Destruction"];

const inputClass =
  "rounded border border-bronze/40 bg-bg px-3 py-2 text-base text-text outline-none focus:border-gold";

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
        {saved && (
          <p className="mb-4 rounded border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
            Profile saved.
          </p>
        )}

        <form action={updateProfile} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Display name
            <input
              type="text"
              name="display_name"
              required
              maxLength={40}
              defaultValue={profile?.display_name ?? ""}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-muted">
            Main army <span className="text-xs">(shown on your profile)</span>
            <select
              name="primary_faction_id"
              defaultValue={profile?.primary_faction_id ?? ""}
              className={inputClass}
            >
              <option value="">— none —</option>
              {ALLIANCES.map((alliance) => (
                <optgroup key={alliance} label={alliance}>
                  {(factions ?? [])
                    .filter((f) => f.grand_alliance === alliance)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="mt-2 rounded border border-gold/60 bg-bg px-4 py-2 font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg"
          >
            Save Profile
          </button>
        </form>
      </section>
    </div>
  );
}
