import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ALLIANCES, getRank } from "@/lib/ranks";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { count: gameCount }, { data: stats }, { data: factionRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("games")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id),
      supabase
        .from("player_faction_stats")
        .select("faction_id, level")
        .eq("profile_id", user.id),
      supabase.from("factions").select("id, grand_alliance"),
    ]);

  const allianceOf = new Map(
    (factionRows ?? []).map((f) => [f.id, f.grand_alliance])
  );
  const peak = new Map(ALLIANCES.map((a) => [a, 0]));
  for (const s of stats ?? []) {
    const alliance = allianceOf.get(s.faction_id);
    if (alliance && s.level > (peak.get(alliance) ?? 0)) {
      peak.set(alliance, s.level);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        aria-hidden
        className="mx-auto h-px w-2/3 max-w-md bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <section className="rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg sm:p-8">
        <h2 className="text-lg tracking-wide text-gold">
          Well met, {profile?.display_name ?? "warrior"}
        </h2>
        <p className="mt-1 text-sm text-muted capitalize">
          Rank: {profile?.role ?? "player"}
        </p>

        <h3 className="mt-5 text-sm tracking-wide text-gold">
          Alliance Badges
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ALLIANCES.map((alliance) => {
            const level = peak.get(alliance) ?? 0;
            const rank = getRank(level, alliance);
            const earned = level > 0;
            return (
              <div
                key={alliance}
                className={`rounded border bg-bg px-2 py-3 text-center ${earned ? "" : "opacity-60"}`}
                style={{ borderColor: `${rank.color}66` }}
              >
                <p className="text-[0.65rem] tracking-widest text-muted uppercase">
                  {alliance}
                </p>
                <div
                  aria-hidden
                  className="mx-auto my-1.5 h-px w-8"
                  style={{
                    background: `linear-gradient(to right, transparent, ${rank.color}, transparent)`,
                  }}
                />
                <p
                  className="font-display text-sm leading-tight"
                  style={{
                    color: rank.color,
                    textShadow: rank.glow ? `0 0 8px ${rank.color}` : undefined,
                  }}
                >
                  {rank.title}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg sm:p-8">
        <h3 className="text-base tracking-wide text-gold">Battle Ledger</h3>
        <p className="mt-2 text-text">
          {gameCount
            ? `${gameCount} game${gameCount === 1 ? "" : "s"} recorded.`
            : "No games recorded yet — chronicle your first battle."}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/games/new"
            className="rounded border border-gold/60 px-4 py-2 text-center font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg"
          >
            Log a Game
          </Link>
          <Link
            href="/games"
            className="rounded border border-bronze/60 px-4 py-2 text-center text-text transition-colors hover:border-gold"
          >
            My Games
          </Link>
          <Link
            href="/proficiency"
            className="rounded border border-bronze/60 px-4 py-2 text-center text-text transition-colors hover:border-gold"
          >
            Proficiency
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg sm:p-8">
        <h3 className="text-base tracking-wide text-gold">Coming soon</h3>
        <p className="mt-2 text-sm text-muted">
          Team statistics, the captain&apos;s pairing helper, and the damage
          calculator.
        </p>
      </section>
    </div>
  );
}
