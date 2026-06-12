"use client";

import { useState, useTransition } from "react";
import {
  saveEvent,
  type EventBasics,
  type SaveEventPayload,
} from "@/app/captain/actions";

type Faction = { id: string; name: string; grand_alliance: string };
type Player = { id: string; display_name: string };

type InitialOpponent = {
  id: string;
  team_name: string;
  faction_ids: string[];
};

const ALLIANCES = ["Order", "Chaos", "Death", "Destruction"];
const MAX_OPP_FACTIONS = 6;

const inputClass =
  "rounded border border-bronze/40 bg-bg px-3 py-2 text-base text-text outline-none focus:border-gold";

function FactionOptions({ factions }: { factions: Faction[] }) {
  return (
    <>
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
    </>
  );
}

type TeamRow = {
  key: string;
  id: string | null;
  teamName: string;
  factionIds: string[];
};

export default function EventForm({
  eventId,
  factions,
  players,
  initialBasics,
  initialLineup,
  initialOpponents,
  submitLabel,
}: {
  eventId: string | null;
  factions: Faction[];
  players: Player[];
  initialBasics?: Partial<EventBasics>;
  initialLineup?: Record<string, string>; // profileId -> factionId
  initialOpponents?: InitialOpponent[];
  submitLabel: string;
}) {
  const [teams, setTeams] = useState<TeamRow[]>(() =>
    initialOpponents && initialOpponents.length > 0
      ? initialOpponents.map((o) => ({
          key: o.id,
          id: o.id,
          teamName: o.team_name,
          factionIds: o.faction_ids,
        }))
      : [{ key: "new-0", id: null, teamName: "", factionIds: [] }]
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => String(fd.get(k) ?? "");

    const lineup: Record<string, string | null> = {};
    for (const p of players) {
      lineup[p.id] = str(`lineup_${p.id}`) || null;
    }

    const payload: SaveEventPayload = {
      basics: {
        name: str("name"),
        start_date: str("start_date") || null,
        end_date: str("end_date") || null,
        location: str("location") || null,
        format: str("format") || null,
        notes: str("notes") || null,
      },
      lineup,
      opponents: teams.map((t) => ({
        id: t.id,
        teamName: str(`opp_${t.key}_name`),
        factionIds: Array.from({ length: MAX_OPP_FACTIONS }, (_, i) =>
          str(`opp_${t.key}_f${i}`)
        ),
      })),
    };

    startTransition(async () => {
      try {
        await saveEvent(eventId, payload);
      } catch (err) {
        // redirect() rejects with a control-flow error we must let through.
        if (err && typeof err === "object" && "digest" in err) throw err;
        setMessage(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* ------------------------------------------------------ Basics */}
      <label className="flex flex-col gap-1 text-sm text-muted">
        Event name
        <input
          type="text"
          name="name"
          required
          defaultValue={initialBasics?.name ?? ""}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Start date <span className="text-xs">(optional)</span>
          <input
            type="date"
            name="start_date"
            defaultValue={initialBasics?.start_date ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          End date <span className="text-xs">(optional)</span>
          <input
            type="date"
            name="end_date"
            defaultValue={initialBasics?.end_date ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Location <span className="text-xs">(optional)</span>
          <input
            type="text"
            name="location"
            defaultValue={initialBasics?.location ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Format <span className="text-xs">(optional)</span>
          <input
            type="text"
            name="format"
            defaultValue={initialBasics?.format ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Notes <span className="text-xs">(optional)</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initialBasics?.notes ?? ""}
          className={inputClass}
        />
      </label>

      {/* ------------------------------------------------- Our lineup */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-display text-sm tracking-wide text-gold">
          Our Lineup
        </legend>
        <p className="-mt-1 text-xs text-muted">
          What each player brings to this event. Leave blank if not attending.
        </p>
        {players.map((p) => (
          <label
            key={p.id}
            className="flex items-center justify-between gap-3 text-sm text-text"
          >
            <span className="min-w-0 truncate">{p.display_name}</span>
            <select
              name={`lineup_${p.id}`}
              defaultValue={initialLineup?.[p.id] ?? ""}
              className={`${inputClass} w-1/2 shrink-0 py-1.5 text-sm`}
            >
              <option value="">— not attending —</option>
              <FactionOptions factions={factions} />
            </select>
          </label>
        ))}
      </fieldset>

      {/* -------------------------------------------- Opponent teams */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-display text-sm tracking-wide text-gold">
          Opponent Teams
        </legend>
        {teams.map((t, ti) => (
          <div
            key={t.key}
            className="flex flex-col gap-2 rounded border border-bronze/40 bg-bg p-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                name={`opp_${t.key}_name`}
                placeholder={`Opponent team ${ti + 1} name`}
                defaultValue={t.teamName}
                required
                className={`${inputClass} min-w-0 flex-1 bg-surface py-1.5 text-sm`}
              />
              {teams.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove opponent team ${ti + 1}`}
                  onClick={() =>
                    setTeams((cur) => cur.filter((x) => x.key !== t.key))
                  }
                  className="shrink-0 rounded border border-loss/50 px-2 py-1 text-sm text-loss transition-colors hover:bg-loss hover:text-bg"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {Array.from({ length: MAX_OPP_FACTIONS }, (_, i) => (
                <select
                  key={i}
                  name={`opp_${t.key}_f${i}`}
                  defaultValue={t.factionIds[i] ?? ""}
                  aria-label={`Opponent team ${ti + 1} faction ${i + 1}`}
                  className={`${inputClass} bg-surface py-1.5 text-sm`}
                >
                  <option value="">— faction {i + 1} —</option>
                  <FactionOptions factions={factions} />
                </select>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setTeams((cur) => [
              ...cur,
              {
                key: `new-${Date.now()}`,
                id: null,
                teamName: "",
                factionIds: [],
              },
            ])
          }
          className="self-start rounded border border-bronze/60 px-3 py-1.5 text-sm text-muted transition-colors hover:border-gold hover:text-text"
        >
          + Add opponent team
        </button>
      </fieldset>

      {message && <p className="text-sm text-loss">{message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded border border-gold/60 bg-bg px-4 py-2 font-display tracking-wide text-gold transition-colors hover:bg-gold hover:text-bg disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
