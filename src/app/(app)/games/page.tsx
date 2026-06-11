import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeleteGameButton from "@/components/DeleteGameButton";

type GameRow = {
  id: string;
  result: "win" | "loss" | "draw";
  score_self: number | null;
  score_opp: number | null;
  played_on: string;
  notes: string | null;
  owner_id: string;
  last_edited_by: string | null;
  player_faction: { name: string; color_hex: string } | null;
  opponent_faction: { name: string; color_hex: string } | null;
  event: { name: string } | null;
};

const RESULT_STYLE = {
  win: "border-win/60 text-win",
  loss: "border-loss/60 text-loss",
  draw: "border-gold/60 text-gold",
} as const;

function FactionDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2.5 rounded-full align-middle"
      style={{ backgroundColor: color }}
    />
  );
}

export default async function MyGamesPage() {
  const supabase = await createClient();

  // RLS scopes the rows to the signed-in player.
  const { data, error } = await supabase
    .from("games")
    .select(
      `id, result, score_self, score_opp, played_on, notes, owner_id, last_edited_by,
       player_faction:factions!games_player_faction_id_fkey(name, color_hex),
       opponent_faction:factions!games_opponent_faction_id_fkey(name, color_hex),
       event:events(name)`
    )
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load games: ${error.message}`);
  }

  const games = (data ?? []) as unknown as GameRow[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl tracking-wide text-gold">My Games</h2>
        <Link
          href="/games/new"
          className="rounded border border-gold/60 px-3 py-1.5 text-sm font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg"
        >
          Log a Game
        </Link>
      </div>

      {games.length === 0 ? (
        <section className="rounded-lg border border-bronze/40 bg-surface p-8 text-center shadow-lg">
          <p className="text-text">No battles chronicled yet.</p>
          <p className="mt-2 text-sm text-muted">
            Log your first game and the ledger begins.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {games.map((g) => (
            <li
              key={g.id}
              className="rounded-lg border border-bronze/40 bg-surface p-4 shadow-lg"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded border px-2 py-0.5 text-xs tracking-wide uppercase ${RESULT_STYLE[g.result]}`}
                >
                  {g.result}
                </span>
                <span className="text-sm text-muted">
                  {new Date(`${g.played_on}T00:00:00`).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "short", year: "numeric" }
                  )}
                </span>
                {g.event && (
                  <span className="text-sm text-muted">· {g.event.name}</span>
                )}
              </div>

              <p className="mt-2 text-text">
                {g.player_faction && (
                  <FactionDot color={g.player_faction.color_hex} />
                )}{" "}
                {g.player_faction?.name ?? "?"}{" "}
                <span className="text-muted">vs</span>{" "}
                {g.opponent_faction && (
                  <FactionDot color={g.opponent_faction.color_hex} />
                )}{" "}
                {g.opponent_faction?.name ?? "?"}
                {g.score_self !== null && g.score_opp !== null && (
                  <span className="ml-2 text-muted">
                    ({g.score_self}–{g.score_opp})
                  </span>
                )}
              </p>

              {g.notes && (
                <p className="mt-2 text-sm text-muted line-clamp-2">{g.notes}</p>
              )}

              {g.last_edited_by && g.last_edited_by !== g.owner_id && (
                <p className="mt-2 text-xs text-bronze italic">
                  Last edited by admin
                </p>
              )}

              <div className="mt-3 flex gap-4 border-t border-bronze/20 pt-3">
                <Link
                  href={`/games/${g.id}/edit`}
                  className="text-sm text-gold underline-offset-2 transition-colors hover:underline"
                >
                  Edit
                </Link>
                <DeleteGameButton gameId={g.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
