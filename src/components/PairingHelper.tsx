"use client";

import { useMemo, useState, useTransition } from "react";
import { savePairings } from "@/app/captain/actions";
import FactionDot from "@/components/FactionDot";
import {
  bestAssignment,
  matchupScore,
  matchupTier,
  TIER_CELL_CLASS,
  type MatchupCell,
} from "@/lib/matchup";

type Player = { id: string; display_name: string };
type Faction = {
  id: string;
  name: string;
  color_hex: string;
  grand_alliance: string;
};
type EventOption = { id: string; name: string };

const ALLIANCES = ["Order", "Chaos", "Death", "Destruction"];
const MAX_SIDE = 6;
const inputClass =
  "rounded border border-bronze/40 bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-gold";

export default function PairingHelper({
  players,
  factions,
  cells,
  events,
}: {
  players: Player[];
  factions: Faction[];
  cells: Record<string, MatchupCell>;
  events: EventOption[];
}) {
  const factionById = useMemo(
    () => new Map(factions.map((f) => [f.id, f])),
    [factions]
  );

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(() =>
    players.slice(0, MAX_SIDE).map((p) => p.id)
  );
  // Six slots; duplicates allowed (opposing teams can field a faction twice).
  const [slots, setSlots] = useState<string[]>(Array(MAX_SIDE).fill(""));
  // playerId -> slot index
  const [assigned, setAssigned] = useState<Record<string, number>>({});
  const [eventId, setEventId] = useState("");
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeSlots = slots
    .map((factionId, index) => ({ factionId, index }))
    .filter((s) => s.factionId !== "");
  const gridPlayers = players.filter((p) => selectedPlayers.includes(p.id));

  const cellFor = (playerId: string, factionId: string) =>
    cells[`${playerId}:${factionId}`];

  function togglePlayer(id: string) {
    setMessage(null);
    setAssigned({});
    setSelectedPlayers((cur) =>
      cur.includes(id)
        ? cur.filter((p) => p !== id)
        : cur.length < MAX_SIDE
          ? [...cur, id]
          : cur
    );
  }

  function setSlot(index: number, factionId: string) {
    setMessage(null);
    setAssigned({});
    setSlots((cur) => cur.map((s, i) => (i === index ? factionId : s)));
  }

  function toggleAssign(playerId: string, slotIndex: number) {
    setMessage(null);
    setAssigned((cur) => {
      const next = { ...cur };
      if (next[playerId] === slotIndex) {
        delete next[playerId];
        return next;
      }
      for (const pid of Object.keys(next)) {
        if (next[pid] === slotIndex) delete next[pid];
      }
      next[playerId] = slotIndex;
      return next;
    });
  }

  function suggest() {
    setMessage(null);
    const scores = gridPlayers.map((p) =>
      activeSlots.map((s) => matchupScore(cellFor(p.id, s.factionId)))
    );
    const result = bestAssignment(scores);
    const next: Record<string, number> = {};
    result.forEach((col, row) => {
      if (col !== null) next[gridPlayers[row].id] = activeSlots[col].index;
    });
    setAssigned(next);
  }

  function record() {
    const pairings = Object.entries(assigned).map(
      ([ourPlayerId, slotIndex]) => ({
        ourPlayerId,
        oppFactionId: slots[slotIndex],
      })
    );
    if (!eventId) {
      setMessage("Pick an event to record against.");
      return;
    }
    if (pairings.length === 0) {
      setMessage("Assign at least one player first.");
      return;
    }
    if (
      !confirm(
        `Record ${pairings.length} pairing${pairings.length === 1 ? "" : "s"} for round ${round}? Existing pairings for this round are replaced.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await savePairings(eventId, round, pairings);
        setMessage(`Round ${round} recorded.`);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not record.");
      }
    });
  }

  return (
    <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
      <h3 className="text-base tracking-wide text-gold">Pairing Helper</h3>
      <p className="mt-0.5 text-xs text-muted">
        Pick your players and the enemy factions, take the suggestion or tap
        cells to override, then record the round.
      </p>

      {/* Our players */}
      <p className="mt-4 text-xs tracking-wide text-muted uppercase">
        Our players ({selectedPlayers.length}/{MAX_SIDE})
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {players.map((p) => {
          const on = selectedPlayers.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlayer(p.id)}
              className={`rounded border px-2.5 py-1.5 text-sm transition-colors ${
                on
                  ? "border-gold/70 bg-gold/15 text-gold"
                  : "border-bronze/40 text-muted hover:border-gold/50"
              }`}
            >
              {p.display_name}
            </button>
          );
        })}
      </div>

      {/* Their factions */}
      <p className="mt-4 text-xs tracking-wide text-muted uppercase">
        Their factions
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {slots.map((value, i) => (
          <select
            key={i}
            value={value}
            onChange={(e) => setSlot(i, e.target.value)}
            aria-label={`Opposing faction ${i + 1}`}
            className={inputClass}
          >
            <option value="">— slot {i + 1} —</option>
            {ALLIANCES.map((alliance) => (
              <optgroup key={alliance} label={alliance}>
                {factions
                  .filter((f) => f.grand_alliance === alliance)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        ))}
      </div>

      {/* Grid */}
      {gridPlayers.length > 0 && activeSlots.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="border-separate border-spacing-px text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface p-1.5" />
                {activeSlots.map((s) => {
                  const f = factionById.get(s.factionId);
                  return (
                    <th
                      key={s.index}
                      className="min-w-16 p-1.5 text-center font-normal text-muted"
                    >
                      {f && <FactionDot color={f.color_hex} />}
                      <span className="mt-0.5 block max-w-20 truncate">
                        {f?.name}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {gridPlayers.map((p) => (
                <tr key={p.id}>
                  <th className="sticky left-0 max-w-28 truncate bg-surface p-1.5 text-left font-normal text-text">
                    {p.display_name}
                  </th>
                  {activeSlots.map((s) => {
                    const cell = cellFor(p.id, s.factionId);
                    const tier = matchupTier(cell);
                    const isAssigned = assigned[p.id] === s.index;
                    return (
                      <td key={s.index} className="p-0">
                        <button
                          type="button"
                          onClick={() => toggleAssign(p.id, s.index)}
                          className={`block w-full min-w-16 cursor-pointer p-2 text-center transition-shadow ${TIER_CELL_CLASS[tier]} ${
                            isAssigned
                              ? "shadow-[inset_0_0_0_2px_var(--accent-gold)]"
                              : ""
                          }`}
                          aria-pressed={isAssigned}
                          aria-label={`Pair ${p.display_name} into ${factionById.get(s.factionId)?.name}`}
                        >
                          {cell ? (
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
                            <span className="opacity-70">untested</span>
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
      )}

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={suggest}
          disabled={gridPlayers.length === 0 || activeSlots.length === 0}
          className="rounded border border-gold/60 px-3 py-1.5 font-display text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg disabled:opacity-50"
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

        <span className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            aria-label="Event"
            className={inputClass}
          >
            <option value="">— event —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm text-muted">
            Round
            <input
              type="number"
              min={1}
              value={round}
              onChange={(e) => setRound(Number(e.target.value))}
              className={`${inputClass} w-16`}
            />
          </label>
          <button
            type="button"
            onClick={record}
            disabled={pending}
            className="rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-display text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg disabled:opacity-50"
          >
            {pending ? "Recording…" : "Record Pairings"}
          </button>
        </span>
      </div>

      {message && <p className="mt-2 text-sm text-bronze">{message}</p>}
      {events.length === 0 && (
        <p className="mt-2 text-xs text-muted">
          Create an event below before recording pairings.
        </p>
      )}
    </section>
  );
}
