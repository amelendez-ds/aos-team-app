import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApprovalButtons from "@/components/ApprovalButtons";
import DeleteGameButton from "@/components/DeleteGameButton";
import DeletePlayerButton from "@/components/DeletePlayerButton";
import FactionDot from "@/components/FactionDot";
import RoleSelect from "@/components/RoleSelect";
import SavedBanner from "@/components/SavedBanner";
import type { Role } from "@/app/admin/actions";

type AdminGameRow = {
  id: string;
  result: "win" | "loss" | "draw";
  score_self: number | null;
  score_opp: number | null;
  played_on: string;
  owner: { display_name: string } | null;
  player_faction: { name: string; color_hex: string } | null;
  opponent_faction: { name: string; color_hex: string } | null;
  event: { name: string } | null;
};

type ProfileRow = {
  id: string;
  display_name: string;
  role: Role;
};

const RESULT_STYLE = {
  win: "text-win",
  loss: "text-loss",
  draw: "text-gold",
} as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ dir?: string; saved?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // UI gate only — the data below is reachable solely because the caller's
  // RLS role allows it; non-admins get bounced before seeing an empty shell.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/");

  const { dir, saved } = await searchParams;
  const ascending = dir === "asc";

  const [
    { data: gameRows, error: gamesError },
    { data: profileRows },
    { data: pendingRows },
  ] = await Promise.all([
      supabase
        .from("games")
        .select(
          `id, result, score_self, score_opp, played_on,
           owner:profiles!games_owner_id_fkey(display_name),
           player_faction:factions!games_player_faction_id_fkey(name, color_hex),
           opponent_faction:factions!games_opponent_faction_id_fkey(name, color_hex),
           event:events(name)`
        )
        .order("played_on", { ascending })
        .order("created_at", { ascending }),
      supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("status", "active")
        .order("display_name"),
      supabase
        .from("profiles")
        .select("id, display_name, email, created_at")
        .eq("status", "pending")
        .order("created_at"),
    ]);

  if (gamesError) {
    throw new Error(`Could not load games: ${gamesError.message}`);
  }

  const games = (gameRows ?? []) as unknown as AdminGameRow[];
  const profiles = (profileRows ?? []) as ProfileRow[];

  const pending = pendingRows ?? [];

  return (
    <div className="flex flex-col gap-6">
      {saved && <SavedBanner message="Game saved." />}

      <h2 className="text-xl tracking-wide text-gold">Admin Panel</h2>

      <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
        <h3 className="text-base tracking-wide text-gold">
          Pending Approvals
          {pending.length > 0 && (
            <span className="ml-2 rounded-full border border-gold/60 px-2 py-0.5 text-xs text-gold">
              {pending.length}
            </span>
          )}
        </h3>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No pending approvals.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-bronze/20">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-text">{p.display_name}</p>
                  <p className="truncate text-xs text-muted">
                    {p.email ?? "no email"} · signed up{" "}
                    {new Date(p.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <ApprovalButtons
                  profileId={p.id}
                  displayName={p.display_name}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
        <h3 className="text-base tracking-wide text-gold">All Games</h3>
        <p className="mt-0.5 text-xs text-muted">
          Every player&apos;s chronicled battles. Edits leave an &ldquo;edited
          by admin&rdquo; stamp.
        </p>

        {games.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No games logged yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-bronze/40 text-xs tracking-wide text-muted uppercase">
                  <th className="py-2 pr-3 font-normal">Player</th>
                  <th className="py-2 pr-3 font-normal">Matchup</th>
                  <th className="py-2 pr-3 font-normal">Result</th>
                  <th className="py-2 pr-3 font-normal">Score</th>
                  <th className="py-2 pr-3 font-normal">
                    <Link
                      href={ascending ? "/admin" : "/admin?dir=asc"}
                      className="transition-colors hover:text-gold"
                    >
                      Date {ascending ? "▲" : "▼"}
                    </Link>
                  </th>
                  <th className="py-2 pr-3 font-normal">Event</th>
                  <th className="py-2 font-normal" />
                </tr>
              </thead>
              <tbody className="divide-y divide-bronze/20">
                {games.map((g) => (
                  <tr key={g.id}>
                    <td className="py-2.5 pr-3 text-text">
                      {g.owner?.display_name ?? "?"}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-text">
                      {g.player_faction && (
                        <FactionDot color={g.player_faction.color_hex} />
                      )}{" "}
                      {g.player_faction?.name ?? "?"}{" "}
                      <span className="text-muted">vs</span>{" "}
                      {g.opponent_faction && (
                        <FactionDot color={g.opponent_faction.color_hex} />
                      )}{" "}
                      {g.opponent_faction?.name ?? "?"}
                    </td>
                    <td
                      className={`py-2.5 pr-3 uppercase ${RESULT_STYLE[g.result]}`}
                    >
                      {g.result}
                    </td>
                    <td className="py-2.5 pr-3 text-muted">
                      {g.score_self !== null && g.score_opp !== null
                        ? `${g.score_self}–${g.score_opp}`
                        : "—"}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-muted">
                      {new Date(`${g.played_on}T00:00:00`).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-muted">
                      {g.event?.name ?? "—"}
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <Link
                        href={`/games/${g.id}/edit?return=/admin`}
                        className="text-gold underline-offset-2 transition-colors hover:underline"
                      >
                        Edit
                      </Link>{" "}
                      <span className="inline-block align-middle">
                        <DeleteGameButton gameId={g.id} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
        <h3 className="text-base tracking-wide text-gold">Role Management</h3>
        <p className="mt-0.5 text-xs text-muted">
          Assign the captain&apos;s seat here. Only admins can change roles.
        </p>

        <ul className="mt-4 flex flex-col divide-y divide-bronze/20">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <p className="min-w-0 truncate text-text">
                {p.display_name}
                {p.id === user.id && (
                  <span className="ml-2 text-xs text-muted">(you)</span>
                )}
              </p>
              {p.id === user.id ? (
                <span className="text-sm text-muted capitalize">{p.role}</span>
              ) : (
                <span className="flex shrink-0 items-center gap-2">
                  <RoleSelect
                    key={`${p.id}-${p.role}`}
                    profileId={p.id}
                    displayName={p.display_name}
                    role={p.role}
                  />
                  <DeletePlayerButton
                    profileId={p.id}
                    displayName={p.display_name}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
