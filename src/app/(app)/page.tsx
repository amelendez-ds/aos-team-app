import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FactionDot from "@/components/FactionDot";
import {
  ALLIANCES,
  calculateOverallLevel,
  getDominantAlliance,
  getRank,
  pickMainArmy,
  type GrandAlliance,
} from "@/lib/ranks";

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
        .select("faction_id, axis, level, games_played, win_rate")
        .eq("profile_id", user.id),
      supabase.from("factions").select("id, name, color_hex, grand_alliance"),
    ]);

  const factionById = new Map(
    (factionRows ?? []).map((f) => [
      f.id,
      {
        name: f.name as string,
        color_hex: f.color_hex as string,
        grand_alliance: f.grand_alliance as GrandAlliance,
      },
    ])
  );
  const allianceOf = new Map<string, GrandAlliance>(
    [...factionById].map(([id, f]) => [id, f.grand_alliance])
  );

  const rows = stats ?? [];
  const peak = new Map(ALLIANCES.map((a) => [a, 0]));
  for (const s of rows) {
    const alliance = allianceOf.get(s.faction_id);
    if (alliance && s.level > (peak.get(alliance) ?? 0)) {
      peak.set(alliance, s.level);
    }
  }

  const overallLevel = calculateOverallLevel(rows);
  const overallRank = getRank(
    overallLevel,
    getDominantAlliance(rows, allianceOf)
  );
  const mainArmy = pickMainArmy(rows);
  const mainArmyFaction = mainArmy
    ? factionById.get(mainArmy.faction_id)
    : undefined;
  const mainArmyRank =
    mainArmy && mainArmyFaction
      ? getRank(mainArmy.level, mainArmyFaction.grand_alliance)
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div
        aria-hidden
        className="mx-auto h-px w-2/3 max-w-md bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <section className="rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg sm:p-8">
        <div className="flex flex-col items-center">
          <div
            className="flex size-32 flex-col items-center justify-center rounded-full border-2 bg-bg p-2"
            style={{ borderColor: overallRank.color }}
          >
            <div className="flex size-full flex-col items-center justify-center rounded-full border border-bronze/40 px-2 text-center">
              <span
                className="font-display text-sm leading-tight"
                style={{
                  color: overallRank.color,
                  textShadow: overallRank.glow
                    ? `0 0 8px ${overallRank.color}`
                    : undefined,
                }}
              >
                {overallRank.title}
              </span>
              <span className="mt-0.5 text-xs text-muted">
                Lv {overallLevel}
              </span>
            </div>
          </div>
        </div>

        <h2 className="mt-4 text-center text-lg tracking-wide text-gold">
          Well met, {profile?.display_name ?? "warrior"}
        </h2>
        <p className="mt-1 text-center text-sm text-muted capitalize">
          Rank: {profile?.role ?? "player"}
        </p>
        {mainArmy && mainArmyFaction && mainArmyRank && (
          <p className="mt-2 text-center text-sm text-text">
            <span className="text-muted">Main Army:</span>{" "}
            <FactionDot color={mainArmyFaction.color_hex} />{" "}
            {mainArmyFaction.name}{" "}
            <span
              className="font-display"
              style={{
                color: mainArmyRank.color,
                textShadow: mainArmyRank.glow
                  ? `0 0 8px ${mainArmyRank.color}`
                  : undefined,
              }}
            >
              · {mainArmyRank.title}
            </span>
          </p>
        )}

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
