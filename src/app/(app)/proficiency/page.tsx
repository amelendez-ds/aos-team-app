import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adjustProficiency } from "@/app/proficiency/actions";
import FactionDot from "@/components/FactionDot";
import { getRank, type GrandAlliance } from "@/lib/ranks";

type StatRow = {
  profile_id: string;
  faction_id: string;
  axis: "playing" | "against";
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  last_played: string;
  manual_delta: number;
  level: number;
};

type FactionInfo = {
  name: string;
  color_hex: string;
  grand_alliance: GrandAlliance;
};

function AdjustButton({
  factionId,
  axis,
  delta,
  label,
}: {
  factionId: string;
  axis: "playing" | "against";
  delta: 1 | -1;
  label: string;
}) {
  return (
    <form action={adjustProficiency.bind(null, factionId, axis, delta)}>
      <button
        aria-label={label}
        className="size-7 rounded border border-bronze/60 text-base leading-none text-muted transition-colors hover:border-gold hover:text-gold"
      >
        {delta > 0 ? "+" : "−"}
      </button>
    </form>
  );
}

function StatsSection({
  title,
  subtitle,
  rows,
  factions,
  axis,
}: {
  title: string;
  subtitle: string;
  rows: StatRow[];
  factions: Map<string, FactionInfo>;
  axis: "playing" | "against";
}) {
  return (
    <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
      <h3 className="text-base tracking-wide text-gold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted">{subtitle}</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Nothing here yet —{" "}
          <Link href="/games/new" className="text-gold hover:underline">
            log a game
          </Link>{" "}
          and the chronicle begins.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-bronze/20">
          {rows.map((r) => {
            const faction = factions.get(r.faction_id);
            const rank = getRank(r.level, faction?.grand_alliance ?? "Order");
            return (
              <li
                key={r.faction_id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-text">
                    {faction && <FactionDot color={faction.color_hex} />}{" "}
                    {faction?.name ?? "Unknown faction"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {r.games_played} game{r.games_played === 1 ? "" : "s"} ·{" "}
                    <span className="text-win">{r.wins}W</span>{" "}
                    <span className="text-loss">{r.losses}L</span> {r.draws}D ·{" "}
                    {Math.round(r.win_rate * 100)}%
                  </p>
                  {r.manual_delta !== 0 && (
                    <p className="mt-0.5 text-xs text-bronze italic">
                      includes {r.manual_delta > 0 ? "+" : ""}
                      {r.manual_delta} manual
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <AdjustButton
                    factionId={r.faction_id}
                    axis={axis}
                    delta={-1}
                    label={`Lower ${faction?.name ?? "faction"} proficiency`}
                  />
                  <span className="flex w-24 flex-col items-center text-center">
                    <span
                      className="font-display text-sm leading-tight"
                      style={{
                        color: rank.color,
                        textShadow: rank.glow
                          ? `0 0 8px ${rank.color}`
                          : undefined,
                      }}
                    >
                      {rank.title}
                    </span>
                    <span className="mt-0.5 text-xs text-muted">
                      Lv {r.level}
                    </span>
                  </span>
                  <AdjustButton
                    factionId={r.faction_id}
                    axis={axis}
                    delta={1}
                    label={`Raise ${faction?.name ?? "faction"} proficiency`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default async function ProficiencyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: stats, error }, { data: factionRows }] = await Promise.all([
    supabase
      .from("player_faction_stats")
      .select("*")
      .eq("profile_id", user.id)
      .order("games_played", { ascending: false }),
    supabase.from("factions").select("id, name, color_hex, grand_alliance"),
  ]);

  if (error) {
    throw new Error(`Could not load proficiency stats: ${error.message}`);
  }

  const factions = new Map<string, FactionInfo>(
    (factionRows ?? []).map((f) => [
      f.id,
      {
        name: f.name,
        color_hex: f.color_hex,
        grand_alliance: f.grand_alliance as GrandAlliance,
      },
    ])
  );

  const rows = (stats ?? []) as StatRow[];
  const playing = rows.filter((r) => r.axis === "playing");
  const against = rows.filter((r) => r.axis === "against");

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl tracking-wide text-gold">My Proficiency</h2>

      <StatsSection
        title="Mastery of My Armies"
        subtitle="Factions you have fielded"
        rows={playing}
        factions={factions}
        axis="playing"
      />
      <StatsSection
        title="Knowledge of the Enemy"
        subtitle="Factions you have faced"
        rows={against}
        factions={factions}
        axis="against"
      />

      <p className="text-xs text-muted">
        Levels rise with games logged; use + / − to add a manual adjustment on
        top.
      </p>
    </div>
  );
}
