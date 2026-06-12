"use client";

import { useState, useTransition } from "react";
import { savePairings } from "@/app/captain/actions";
import FactionDot from "@/components/FactionDot";
import {
  bestAssignment,
  combinedScore,
  matchupTier,
  prefTier,
  TIER_CELL_CLASS,
  type MatchupCell,
} from "@/lib/matchup";

export type LineupPlayer = {
  playerId: string;
  displayName: string;
  ownFaction: { name: string; color_hex: string } | null;
};

export type OpponentTeam = {
  id: string;
  teamName: string;
  factionIds: string[];
};

type FactionInfo = { name: string; color_hex: string };

export type RecordedPairings = Record<
  string, // opponentId
  { round: number; rows: { ourPlayerId: string; oppFactionId: string }[] }
>;

type ViewMode = "combined" | "proficiency" | "preference";

const VIEW_LABELS: { mode: ViewMode; label: string }[] = [
  { mode: "combined", label: "Combined" },
  { mode: "proficiency", label: "Proficiency" },
  { mode: "preference", label: "Preference" },
];

export default function WarRoom({
  eventId,
  lineup,
  opponents,
  factions,
  cells, // `${playerId}:${factionId}` -> against-axis stats
  prefs, // `${playerId}:${opponentId}:${factionId}` -> rank 1..6
  recorded, // opponentId -> previously recorded pairings
}: {
  eventId: string;
  lineup: LineupPlayer[];
  opponents: OpponentTeam[];
  factions: Record<string, FactionInfo>;
  cells: Record<string, MatchupCell>;
  prefs: Record<string, number>;
  recorded: RecordedPairings;
}) {
  // Rehydrate saved assignments: map each recorded faction back to a grid
  // column, skipping columns already used (a team can repeat a faction).
  function loadRecorded(oppId: string): Record<string, number> {
    const opp = opponents.find((o) => o.id === oppId);
    const rows = recorded[oppId]?.rows ?? [];
    if (!opp) return {};
    const used = new Set<number>();
    const next: Record<string, number> = {};
    for (const r of rows) {
      const col = opp.factionIds.findIndex(
        (fid, i) => fid === r.oppFactionId && !used.has(i)
      );
      if (col >= 0) {
        used.add(col);
        next[r.ourPlayerId] = col;
      }
    }
    return next;
  }

  const [opponentId, setOpponentId] = useState<string>(opponents[0]?.id ?? "");
  const [view, setView] = useState<ViewMode>("combined");
  // playerId -> column index into the opponent's faction list
  const [assigned, setAssigned] = useState<Record<string, number>>(() =>
    loadRecorded(opponents[0]?.id ?? "")
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const opponent = opponents.find((o) => o.id === opponentId);

  function pickOpponent(id: string) {
    setOpponentId(id);
    setAssigned(loadRecorded(id));
    setMessage(null);
  }

  const cellFor = (playerId: string, factionId: string) =>
    cells[`${playerId}:${factionId}`];
  const prefFor = (playerId: string, factionId: string) =>
    opponent ? prefs[`${playerId}:${opponent.id}:${factionId}`] : undefined;

  function toggleAssign(playerId: string, col: number) {
    setMessage(null);
    setAssigned((cur) => {
      const next = { ...cur };
      if (next[playerId] === col) {
        delete next[playerId];
        return next;
      }
      for (const pid of Object.keys(next)) {
        if (next[pid] === col) delete next[pid];
      }
      next[playerId] = col;
      return next;
    });
  }

  function suggest() {
    if (!opponent) return;
    setMessage(null);
    const scores = lineup.map((p) =>
      opponent.factionIds.map((fid) =>
        combinedScore(cellFor(p.playerId, fid), prefFor(p.playerId, fid))
      )
    );
    const result = bestAssignment(scores);
    const next: Record<string, number> = {};
    result.forEach((col, row) => {
      if (col !== null) next[lineup[row].playerId] = col;
    });
    setAssigned(next);
  }

  function record() {
    if (!opponent) return;
    const pairings = Object.entries(assigned).map(([ourPlayerId, col]) => ({
      ourPlayerId,
      oppFactionId: opponent.factionIds[col],
    }));
    if (pairings.length === 0) {
      setMessage("Assign at least one player first.");
      return;
    }
    const already = recorded[opponent.id];
    if (
      !confirm(
        already
          ? `Replace the recorded pairings vs ${opponent.teamName}?`
          : `Record ${pairings.length} pairing${pairings.length === 1 ? "" : "s"} vs ${opponent.teamName}?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await savePairings(eventId, opponent.id, pairings);
        setMessage(`Pairings vs ${opponent.teamName} recorded.`);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not record.");
      }
    });
  }

  if (opponents.length === 0) {
    return (
      <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
        <h3 className="text-base tracking-wide text-gold">War Room</h3>
        <p className="mt-2 text-sm text-muted">
          This event has no opponent teams yet — add them via Edit in the
          Events section below.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
      <h3 className="text-base tracking-wide text-gold">War Room</h3>

      {/* Opponent team selector */}
      <p className="mt-3 text-xs tracking-widest text-muted uppercase">
        Facing this round
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {opponents.map((o) => {
          const on = o.id === opponentId;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => pickOpponent(o.id)}
              className={`rounded border px-3 py-2 text-left text-sm transition-colors ${
                on
                  ? "border-gold/70 bg-gold/15 text-gold"
                  : "border-bronze/40 text-muted hover:border-gold/50"
              }`}
            >
              <span className="block font-display tracking-wide">
                {o.teamName}
                {recorded[o.id] && (
                  <span className="ml-1.5 text-xs text-win">
                    ✓ R{recorded[o.id].round}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block">
                {o.factionIds.map((fid, i) => (
                  <span key={`${fid}-${i}`} className="mr-1">
                    <FactionDot color={factions[fid]?.color_hex ?? "#888"} />
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {lineup.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No lineup set for this event — assign player factions via Edit in
          the Events section below.
        </p>
      ) : (
        opponent && (
          <>
            {/* View toggle */}
            <div className="mt-4 inline-flex rounded border border-bronze/40">
              {VIEW_LABELS.map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  className={`px-3 py-1.5 text-xs tracking-wide uppercase transition-colors first:rounded-l last:rounded-r ${
                    view === mode
                      ? "bg-gold/15 text-gold"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Combined grid: assess and assign in one place */}
            <div className="mt-3 overflow-x-auto">
              <table className="border-separate border-spacing-px text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-surface p-1.5 text-left font-normal text-muted">
                      Player <span className="normal-case">(plays)</span>
                    </th>
                    {opponent.factionIds.map((fid, i) => {
                      const f = factions[fid];
                      return (
                        <th
                          key={`${fid}-${i}`}
                          className="min-w-18 p-1.5 text-center font-normal text-muted"
                        >
                          {f && <FactionDot color={f.color_hex} />}
                          <span className="mt-0.5 block max-w-24 truncate">
                            {f?.name ?? "?"}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {lineup.map((p) => (
                    <tr key={p.playerId}>
                      <th className="sticky left-0 max-w-36 bg-surface p-1.5 text-left font-normal">
                        <span className="block truncate text-text">
                          {p.displayName}
                        </span>
                        <span className="block truncate text-muted">
                          {p.ownFaction ? (
                            <>
                              <FactionDot color={p.ownFaction.color_hex} />{" "}
                              {p.ownFaction.name}
                            </>
                          ) : (
                            "no faction set"
                          )}
                        </span>
                      </th>
                      {opponent.factionIds.map((fid, col) => {
                        const cell = cellFor(p.playerId, fid);
                        const rank = prefFor(p.playerId, fid);
                        const tier =
                          view === "preference"
                            ? prefTier(rank)
                            : matchupTier(cell);
                        const isAssigned = assigned[p.playerId] === col;
                        return (
                          <td key={`${fid}-${col}`} className="p-0">
                            <button
                              type="button"
                              onClick={() => toggleAssign(p.playerId, col)}
                              aria-pressed={isAssigned}
                              aria-label={`Pair ${p.displayName} into ${factions[fid]?.name ?? "faction"}`}
                              className={`relative block w-full min-w-18 cursor-pointer p-2 text-center transition-shadow ${TIER_CELL_CLASS[tier]} ${
                                isAssigned
                                  ? "shadow-[inset_0_0_0_2px_var(--accent-gold)]"
                                  : ""
                              }`}
                            >
                              {view !== "proficiency" && rank && (
                                <span
                                  className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full border border-current text-[0.6rem] leading-none"
                                  title={`Preference rank ${rank}`}
                                >
                                  {rank}
                                </span>
                              )}
                              {view === "preference" ? (
                                <span className="block py-1 font-semibold">
                                  {rank ? `#${rank}` : "unranked"}
                                </span>
                              ) : cell ? (
                                <>
                                  <span className="block font-semibold">
                                    Lv {cell.level}
                                  </span>
                                  <span className="block opacity-80">
                                    {Math.round(cell.winRate * 100)}% ·{" "}
                                    {cell.gamesPlayed}g
                                  </span>
                                </>
                              ) : (
                                <span className="block py-1 opacity-70">
                                  untested
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Tap a cell to pair · gold ring = assigned · badge = that
              player&apos;s preference rank
            </p>

            {/* Controls */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={suggest}
                className="rounded border border-gold/60 px-3 py-1.5 font-display text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg"
              >
                Suggest Pairing
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssigned({});
                  setMessage(null);
                }}
                className="rounded border border-bronze/60 px-3 py-1.5 text-sm text-muted transition-colors hover:border-gold hover:text-text"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={record}
                disabled={pending}
                className="ml-auto rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-display text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg disabled:opacity-50"
              >
                {pending
                  ? "Recording…"
                  : recorded[opponent.id]
                    ? "Update Pairings"
                    : "Record Pairings"}
              </button>
            </div>
            {message && <p className="mt-2 text-sm text-bronze">{message}</p>}
          </>
        )
      )}
    </section>
  );
}
