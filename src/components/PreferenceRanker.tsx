"use client";

import { useState, useTransition } from "react";
import { savePreferences } from "@/app/events/actions";
import FactionDot from "@/components/FactionDot";

type RankedFaction = { id: string; name: string; color_hex: string };

// Rank one opponent team's factions, 1 = the matchup you want most.
// Arrow re-ordering: quick on a phone, no drag dependency.
export default function PreferenceRanker({
  eventId,
  opponentId,
  factions,
  saved,
}: {
  eventId: string;
  opponentId: string;
  factions: RankedFaction[]; // in saved-rank order when saved, else default
  saved: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState<RankedFaction[]>(factions);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    setOrder((cur) => {
      const next = [...cur];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        await savePreferences(
          eventId,
          opponentId,
          order.map((f) => f.id)
        );
        setEditing(false);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  if (!editing) {
    return (
      <div className="mt-2">
        {saved ? (
          <ol className="flex flex-col gap-1 text-sm">
            {factions.map((f, i) => (
              <li key={f.id} className="text-text">
                <span className="inline-block w-5 text-muted">{i + 1}.</span>
                <FactionDot color={f.color_hex} /> {f.name}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">No ranking submitted yet.</p>
        )}
        <button
          type="button"
          onClick={() => {
            setOrder(factions);
            setMessage(null);
            setEditing(true);
          }}
          className={`mt-2 rounded border px-3 py-1.5 text-sm transition-colors ${
            saved
              ? "border-bronze/60 text-muted hover:border-gold hover:text-text"
              : "border-gold/60 font-display tracking-wide text-gold hover:bg-gold hover:text-bg"
          }`}
        >
          {saved ? "Change ranking" : "Rank your matchups"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded border border-bronze/40 bg-bg p-3">
      <p className="text-xs text-muted">
        1 = the matchup you most want to play.
      </p>
      <ol className="mt-2 flex flex-col gap-1.5">
        {order.map((f, i) => (
          <li key={f.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 shrink-0 text-muted">{i + 1}.</span>
            <span className="min-w-0 flex-1 truncate text-text">
              <FactionDot color={f.color_hex} /> {f.name}
            </span>
            <button
              type="button"
              aria-label={`Move ${f.name} up`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="size-8 shrink-0 rounded border border-bronze/60 text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-30"
            >
              ▲
            </button>
            <button
              type="button"
              aria-label={`Move ${f.name} down`}
              disabled={i === order.length - 1}
              onClick={() => move(i, 1)}
              className="size-8 shrink-0 rounded border border-bronze/60 text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-30"
            >
              ▼
            </button>
          </li>
        ))}
      </ol>
      {message && <p className="mt-2 text-sm text-loss">{message}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded border border-gold/60 px-3 py-1.5 font-display text-sm tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save Ranking"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded border border-bronze/60 px-3 py-1.5 text-sm text-muted transition-colors hover:border-gold hover:text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
